# DevBuddy

A MERN web app for onboarding new developers at a software house.
HR, Managers and Admins sign in to manage developers. An n8n automation
(WhatsApp + AI) will connect to it later.

**Current status: Phase 4**: secure login, app layout with sidebar, developers list/add/detail pages, the n8n "new developer" webhook, the Bot API that n8n calls (WhatsApp context, daily run, weekly report), and the Overview, Knowledge gaps, Team & roles and Audit log pages.

## Folder structure

```
devbuddy-app/
├── client/                  React + Vite + Tailwind (the website)
│   ├── index.html           loads fonts (Fraunces, Inter)
│   ├── vite.config.js       dev server + /api proxy to the Express server
│   └── src/
│       ├── main.jsx         app entry: router + auth provider
│       ├── App.jsx          list of pages (routes)
│       ├── api.js           fetch helper (always sends the cookie)
│       ├── index.css        Tailwind + design colors and fonts
│       ├── nav.js           sidebar links + which roles see them
│       ├── context/AuthContext.jsx     "who is logged in" for the whole app
│       ├── lib/             format.js (dates, initials), phone.js (number hint)
│       ├── components/      AppLayout (sidebar), ProtectedRoute, ProgressBar,
│       │                    StatusPill, Alert, KpiCard, Pagination
│       └── pages/
│           ├── Login.jsx, Overview.jsx
│           ├── Developers.jsx, AddDeveloper.jsx, DeveloperDetail.jsx
│           └── KnowledgeGaps.jsx, Team.jsx, AuditLog.jsx
│
└── server/                  Node.js + Express + Mongoose (the API)
    ├── .env.example         copy to .env and fill in
    └── src/
        ├── server.js        entry: connect DB, start listening
        ├── app.js           Express app: security middleware + routes
        ├── config/          env.js (reads .env), db.js (MongoDB connection)
        ├── models/          User, Developer, Task, Progress, Question, AuditLog
        ├── middleware/      auth (requireAuth/requireRole), rate limit, validation, errors
        ├── routes/          auth, developers, users, stats, questions, audit, bot
        │                    (URLs + role checks + validation rules)
        ├── controllers/     auth, developers, users, stats, questions, audit,
        │                    bot, botSchedule (the logic)
        ├── services/n8n.js  calls the n8n webhook (server only)
        ├── utils/           token.js (JWT + cookie), audit.js, phone.js (clean numbers),
        │                    onboarding.js ("stuck" rules, progress bar states),
        │                    time.js (Pakistan-time dates), scope.js (managers see
        │                    only their developers), gaps.js (knowledge-gap grouping)
        └── seed/            seed.js (admin + tasks), demo.js (--demo data)
```

## Requirements

- Node.js 20 or newer (`node -v`)
- A free MongoDB Atlas cluster

## Setup

### 1. Install packages

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Create `server/.env`

Copy the example file and edit it:

```bash
cd server
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

| Variable | What to put |
| --- | --- |
| `PORT` | `5000` |
| `NODE_ENV` | `development` locally, `production` when deployed |
| `MONGO_URI` | Your Atlas connection string (Atlas → *Connect* → *Drivers*). Put a database name before the `?`, e.g. `.../devbuddy?retryWrites=true` |
| `JWT_SECRET` | A long random string. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | `http://localhost:5173` |
| `COOKIE_SECURE` | `true`. Only set `false` if your browser (e.g. Safari) won't keep the login cookie on `http://localhost` |
| `TRUST_PROXY` | `0` locally; `1` when deployed behind a host like Render |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | The first admin account (password at least 10 characters) |
| `MANAGER_NAME` / `MANAGER_EMAIL` / `MANAGER_PASSWORD` / `MANAGER_PHONE` | Optional: a real manager account and their WhatsApp number (see *Manager phone numbers* below) |
| `DEMO_PASSWORD` | Password for the demo HR/manager accounts (only needed for `--demo`) |
| `DEMO_MANAGER_PHONE` | WhatsApp number given to the demo managers by `--demo` (e.g. your own test phone). Empty = demo managers have no phone |
| `N8N_NEW_DEVELOPER_WEBHOOK` | The n8n "Webhook" node's production URL. Leave empty to skip; developers are still saved |
| `N8N_WEBHOOK_SECRET` | Long random string. n8n should reject requests whose `x-devbuddy-secret` header doesn't match |

In Atlas, also go to **Network Access** and allow your current IP address.

`.env` is listed in `.gitignore`, so it is never committed.

### 3. Seed the database

```bash
cd server
npm run seed
```

This creates the admin user and the 7 onboarding tasks (T1–T7). Running it
again is safe: it won't create duplicates or change an existing admin's password.

To also get demo data (2 managers, 1 HR user, 12 developers with progress and questions):

```bash
npm run seed -- --demo
```

Demo logins (password = `DEMO_PASSWORD`): `sana.malik@example.com` and
`bilal.ahmed@example.com` (managers), `ayesha.khan@example.com` (HR).
Don't use `--demo` on a production database.

Demo developers are saved with `isDemo: true`. The web app shows them with a
small **Demo** tag, but the WhatsApp bot ignores them completely: the daily run
and weekly report never return or change them. Re-running `--demo` also marks
demo developers from older seeds and re-applies `DEMO_MANAGER_PHONE` to the
demo managers (real managers from `MANAGER_*` are never touched).

### 4. Run both apps (two terminals)

```bash
# Terminal 1
cd server
npm run dev        # API on http://localhost:5000 (restarts on file changes)

# Terminal 2
cd client
npm run dev        # website on http://localhost:5173
```

Open http://localhost:5173 and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## API

| Method | URL | Who | What it does |
| --- | --- | --- | --- |
| GET | `/api/health` | anyone | `{ status: "ok" }` |
| POST | `/api/auth/login` | anyone (rate limited) | body `{ email, password, rememberMe }`; sets the auth cookie |
| POST | `/api/auth/logout` | anyone | clears the auth cookie |
| GET | `/api/auth/me` | signed in | returns the current user |
| GET | `/api/developers` | admin, hr, manager (own team only) | query `q`, `role`, `status` (`on_track`/`stuck`/`completed`), `page`; 10 per page |
| POST | `/api/developers` | admin, hr | body `{ name, whatsappNumber, role, joinDate, manager }`; 409 if the number exists |
| GET | `/api/developers/:id` | admin, hr, manager (own team only) | developer + 7-day timeline + questions |
| GET | `/api/users/managers` | admin, hr | `[{ _id, name }]` for the manager dropdown (active managers only) |
| GET | `/api/stats/overview` | admin, hr, manager (own team only) | `{ kpis, byDay, attention }` for the Overview page |
| GET | `/api/questions/gaps` | admin, manager (own team only) | `{ kpis, gaps }`: open knowledge gaps, grouped |
| PATCH | `/api/questions/gaps/resolve` | admin, manager (own team only) | body `{ key }` (a gap's `key`); marks the group fixed; `404` if nothing open |
| GET | `/api/users` | admin | all staff users (no password data) |
| POST | `/api/users` | admin | body `{ name, email, role, managerPhone?, password }`; `409` if the email exists |
| PATCH | `/api/users/:id` | admin | body `{ role?, active? }`; can't change your own role or deactivate yourself |
| GET | `/api/audit` | admin | query `action`, `page`; 25 per page, newest first, plus the list of action types |

## Pages (Phase 4)

**Overview** (`/overview`, everyone; managers see only their developers)
- KPIs: *in onboarding* (active developers), *finished week one* (completed),
  *stuck 2+ days* (current task pending 2+ calendar days, the same rule as the
  daily run's `manager_alert`), *average days to finish* (join date to the day 7
  task being done, counting both days).
- *Where everyone is*: active developers per day 1–7, built from plain divs.
  The stuck part of each bar (same rule as the "Stuck" pill) is shown in `#C2410C`.
- *Needs your attention*: up to 5 stuck developers (most days waiting first),
  up to 5 most-asked unanswered questions, up to 5 most recently finished developers.

**Knowledge gaps** (`/knowledge-gaps`, admin + manager)
- Questions with `foundInDocs: false` that aren't resolved yet, grouped by text
  (ignoring upper/lower case and spaces at the start and end), with times asked
  and last asked date.
- *Mark fixed* sets `resolved: true` on every open question in that group and
  writes a `knowledge_gap_resolved` audit entry. If the same question is asked
  again later, it shows up as a new gap.
- KPIs: questions asked in the last 30 days, % answered from docs, open gaps.

**Team & roles** (`/team`, admin only)
- Lists staff with role and last sign-in. *Invite member* creates an account
  with a temporary password (min. 10 characters); the WhatsApp number field
  appears only for managers.
- Admins can change another user's role or deactivate / reactivate them.
  A deactivated user can't sign in (`403`) and their open session stops working
  on the next request. You can't change your own role or deactivate yourself.
- Audit entries: `user_created`, `user_role_changed`, `user_deactivated`,
  `user_reactivated`, `login_blocked_inactive`.

**Audit log** (`/audit`, admin only): when, who, action tag, details and IP,
filterable by action type, 25 per page. Entries with no user are the n8n bot
(`bot.*`) or failed logins with an unknown email.

## n8n webhook

After a developer is saved, the server sends:

```
POST <N8N_NEW_DEVELOPER_WEBHOOK>
x-devbuddy-secret: <N8N_WEBHOOK_SECRET>

{ "dev_id": "...", "name": "Fatima Noor", "whatsapp_number": "923001234567",
  "role": "Backend", "join_date": "2026-11-16", "manager_whatsapp": "923005550201" }
```

`manager_whatsapp` is `null` if there's no manager or the manager has no number.
If n8n is down or returns an error, the developer stays saved, the error is logged
(console + `welcome_webhook_failed` audit entry), and the UI shows a warning.

Error responses always look like `{ "message": "..." }`.
Status codes: `400` invalid input, `401` wrong credentials / not signed in,
`403` wrong role or deactivated account, `404` not found (or not on your team), `409` duplicate WhatsApp number or email, `423` account locked, `429` too many attempts from this IP.

## Bot API (for n8n)

Called by the n8n WhatsApp workflow, server to server. These routes ignore the
login cookie. Every request must send the header `x-devbuddy-secret` with the
value of `N8N_WEBHOOK_SECRET`, otherwise the response is `401`. Limit: 120
requests per minute per IP (`429` after that).

| Method | URL | Body / query | Returns |
| --- | --- | --- | --- |
| GET | `/api/bot/context` | `?phone=` (cleaned like Add developer) | `{ registered, developer, pendingTask }` |
| POST | `/api/bot/tasks/complete` | `{ progressId }` | `{ ok, taskTitle, day }`; `404` unknown, `409` already done |
| POST | `/api/bot/questions` | `{ developerId, question, answer, foundInDocs }` | `201 { ok }`; `404` unknown developer |
| POST | `/api/bot/daily/run` | optional `?dryRun=true` | `{ date, dryRun, summary, actions }` |
| GET | `/api/bot/weekly-report` | none | `{ from, to, managers }` |

Examples (PowerShell users: use `curl.exe`, write each command on one line, and
put JSON bodies in a file with `-d "@body.json"`):

```bash
SECRET="your N8N_WEBHOOK_SECRET"

# Who is this WhatsApp number, and what's their open task?
curl "http://localhost:5000/api/bot/context?phone=923001234567" \
  -H "x-devbuddy-secret: $SECRET"
# -> {"registered":true,
#     "developer":{"id":"...","name":"Fatima Noor","role":"Backend","currentDay":5,"status":"active"},
#     "pendingTask":{"progressId":"...","taskId":"T5","day":5,"title":"First bug fix","description":"..."}}
# Unknown number -> {"registered":false,"developer":null,"pendingTask":null}

# Developer replied "done"
curl -X POST http://localhost:5000/api/bot/tasks/complete \
  -H "x-devbuddy-secret: $SECRET" -H "Content-Type: application/json" \
  -d '{"progressId":"<pendingTask.progressId from /context>"}'
# -> {"ok":true,"taskTitle":"First bug fix","day":5}

# Save a question the AI answered (or couldn't)
curl -X POST http://localhost:5000/api/bot/questions \
  -H "x-devbuddy-secret: $SECRET" -H "Content-Type: application/json" \
  -d '{"developerId":"<developer.id from /context>","question":"Who approves migrations?","answer":"","foundInDocs":false}'
# -> {"ok":true}
```

### Daily run (every morning, 9:00 Pakistan time)

For every **active** developer whose join date has arrived, it looks at the
Progress for their current day:

| Current task is… | What happens | Action(s) returned |
| --- | --- | --- |
| done, day 1–6 | `currentDay + 1`, next task assigned (pending) | `next_task` (with the new day's task) |
| done, day 7 | developer status becomes `completed` | `completed` |
| pending 2+ days | nothing changes | `reminder` (to developer) **and** `manager_alert` (to manager) |
| pending 1 day | nothing changes | `reminder` |
| pending, less than 1 day | nothing changes | none |

Demo developers (`isDemo: true`) are skipped entirely; `summary.demoSkipped` shows how many.

"Days pending" counts **calendar days in Pakistan** between the day the task
was assigned (or the join date, if later) and today. So a task assigned at
9:00 Monday is 1 day pending on Tuesday's run, whatever the exact minute.

**Safe to run twice:** each developer gets `lastDailyRunAt` when handled, and is
skipped for the rest of that Pakistan day, so a retry or a double trigger
never sends duplicate messages.

```bash
# Preview: shows what would happen, changes nothing (use this while testing)
curl -X POST "http://localhost:5000/api/bot/daily/run?dryRun=true" \
  -H "x-devbuddy-secret: $SECRET"

# The real run (what the n8n Schedule Trigger calls at 9:00)
curl -X POST http://localhost:5000/api/bot/daily/run \
  -H "x-devbuddy-secret: $SECRET"
# -> {"date":"2026-11-16","dryRun":false,
#     "summary":{"processed":10,"alreadyRunToday":0,"notStartedYet":1,"demoSkipped":0,
#                "counts":{"next_task":2,"completed":1,"reminder":5,"manager_alert":4}},
#     "actions":[
#       {"type":"next_task","developerId":"...","name":"Hamza Raza","phone":"923005550101",
#        "managerName":"Sana Malik","managerPhone":"923005550201","missingManagerPhone":false,"day":4,
#        "taskTitle":"Codebase walkthrough","taskDescription":"...","daysPending":0},
#       {"type":"manager_alert","name":"Fatima Noor","day":5,"daysPending":2, ...}, ...]}
```

In n8n: **Schedule Trigger** (9:00, workflow time zone `Asia/Karachi`) →
**HTTP Request** (POST `/daily/run`) → **Split Out** on `actions` → **Switch**
on `type` → send WhatsApp to `phone` (`next_task`, `completed`, `reminder`)
or to `managerPhone` (`manager_alert`).

If the developer has no manager, or the manager has no phone, the action is
still returned with `"managerPhone": null` and `"missingManagerPhone": true`.
In n8n, add an **IF** before the manager message: skip it when
`missingManagerPhone` is true. The developer's own `reminder` still goes out.
Each real run writes one `bot.daily_run` audit entry with the counts.

### Weekly report

Covers the **last 7 days** up to the moment it's called. One entry per manager
who has developers to report on: active developers, plus finished ones with
activity that week.

```bash
curl http://localhost:5000/api/bot/weekly-report \
  -H "x-devbuddy-secret: $SECRET"
# -> {"from":"2026-11-07T...","to":"2026-11-14T...","managers":[
#      {"managerName":"Sana Malik","managerPhone":"923005550201","missingManagerPhone":false,
#       "developers":[
#         {"id":"...","name":"Fatima Noor","currentDay":5,"status":"active","stuck":true,
#          "tasksDoneThisWeek":4,"questionsNotInDocsThisWeek":1}, ...],
#       "unansweredQuestions":[
#         {"developerName":"Fatima Noor","question":"Who approves database migrations...?",
#          "answer":"","resolved":false,"askedAt":"..."}]}]}
```

`stuck` uses the same rule as the dashboard (current task pending more than 24 hours).
`unansweredQuestions` = questions this week that weren't found in the docs.
Demo developers are never included. A manager without a phone still appears,
with `missingManagerPhone: true` (skip sending that one).

### n8n setup tips

Use an **HTTP Request** node and add the header under *Send Headers*
(or create a "Header Auth" credential so the secret isn't stored in the node itself).
Completing a task and saving a question are written to the audit log as
`bot.task_completed` / `bot.question_saved` (with `user = null`).

### Manager phone numbers

Managers need `managerPhone` for alerts and the weekly report. Set one with the
`MANAGER_*` variables in `.env` and run `npm run seed` (it creates the manager,
or just updates the phone if the email already exists). Numbers in any format
(`0300 1234567`, `+92 300 1234567`) are saved as digits, e.g. `923001234567`.

## Security notes

- Passwords are hashed with bcrypt (the `bcryptjs` package: same algorithm, no native build tools needed on Windows).
- The login token (JWT) lives in an `httpOnly`, `secure`, `sameSite=strict` cookie. JavaScript in the page can't read it.
- 5 wrong passwords in a row lock the account for 15 minutes. Each IP is also limited to 10 login attempts per 15 minutes.
- Every successful login, failed login, attempt on a locked or deactivated account, lockout and logout is written to the `auditlogs` collection, as are user changes and fixed knowledge gaps. Passwords (including temporary ones) are never logged.
- The Bot API compares the secret with `crypto.timingSafeEqual` (on SHA-256 hashes), so response timing can't leak it. If `N8N_WEBHOOK_SECRET` is empty, every bot request is rejected.
- In development, Vite forwards `/api` to the server, so the browser sees one site. When deploying, serve the client and API from the same domain (or a subdomain), because `sameSite=strict` cookies are not sent across different sites.
