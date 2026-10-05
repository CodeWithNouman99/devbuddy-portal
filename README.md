# DevBuddy HR Portal

The HR-facing website for **DevBuddy**, an AI onboarding buddy that looks after a new developer's first week at a software house. HR fills in one short form, and DevBuddy takes it from there: it saves the developer, sends a WhatsApp welcome with the Day 1 task, and keeps going every morning.

Built for a fictional company, **Nexora Labs**.
**Live demo:** https://devbuddy-portal.vercel.app/

## What the portal does

- HR adds a new developer: name, WhatsApp number, role, join date and manager's WhatsApp number.
- Each field is checked before anything is sent (name, 10 to 15 digit numbers, role, join date within one year of today), with a clear message under the field that needs fixing.
- The form posts the data to an n8n webhook. n8n adds the developer to Google Sheets, sends the WhatsApp welcome message and creates the Day 1 task.
- The portal shows a confirmation once the developer is added, or a clear error if something went wrong.

## Tech stack

- React and Vite
- Tailwind CSS
- n8n Cloud webhook as the backend (the workflows are in the [n8n-automation-projects](https://github.com/CodeWithNouman99/n8n-automation-projects/tree/main/devBuddy) repo)

## Run it locally

1. Install dependencies:

```
npm install
```

2. Create a file named `.env` in the project root with your n8n Production webhook URL:

```
VITE_WEBHOOK_URL=https://your-n8n-instance/webhook/your-path
```

3. Start the app:

```
npm run dev
```

4. Open `http://localhost:5173`.

The `.env` file is ignored by Git, so your webhook URL stays private. Restart the dev server after changing it.

## How it fits into DevBuddy

| Part | What it does |
|---|---|
| HR Portal (this repo) | Adds a developer through a form |
| `devbuddy-main` workflow | Welcome message and the AI buddy that answers questions on WhatsApp |
| `devbuddy-daily` workflow | Sends the next task every morning, reminds, and alerts the manager when a developer is stuck |
| `devbuddy-weekly-report` workflow | Sends each manager a weekly summary |

## Roadmap

- Live deployment on Vercel
- Manager dashboard showing each developer's progress

## Author

Nouman Aslam · [GitHub](https://github.com/CodeWithNouman99)