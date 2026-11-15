// /overview: KPI strip, "Where everyone is" (developers per day) and
// "Needs your attention". Managers only see numbers for their own developers.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import KpiCard from '../components/KpiCard.jsx';
import { formatDate } from '../lib/format.js';
import { rolesFor } from '../nav.js';

export default function Overview() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/stats/overview')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const firstName = user.name.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl">Hello {firstName}</h1>
      <p className="mt-1 text-sm text-muted">
        {user.role === 'manager' ? 'How your team is doing this week.' : 'How everyone onboarding is doing this week.'}
      </p>

      <div className="mt-4">
        <Alert>{error}</Alert>
      </div>

      {!data && !error && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="In onboarding" value={data.kpis.inOnboarding} hint="Active, days 1–7" />
            <KpiCard label="Finished week one" value={data.kpis.finishedWeekOne} hint="All 7 tasks done" />
            <KpiCard
              label="Stuck 2+ days"
              value={data.kpis.stuckTwoPlusDays}
              hint="Manager has been alerted"
              tone={data.kpis.stuckTwoPlusDays > 0 ? 'warn' : undefined}
            />
            <KpiCard
              label="Average days to finish"
              value={data.kpis.avgDaysToFinish ?? '–'}
              hint={data.kpis.avgDaysToFinish === null ? 'Nobody has finished yet' : 'From join date to day 7 done'}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <DayChart byDay={data.byDay} />
            <Attention attention={data.attention} canSeeGaps={rolesFor('/knowledge-gaps').includes(user.role)} />
          </div>
        </>
      )}
    </div>
  );
}

// Bar chart made of plain divs: one column per day, the stuck part at the
// bottom in the "stuck" color, on-track developers stacked above it.
function DayChart({ byDay }) {
  const max = Math.max(1, ...byDay.map((d) => d.total));
  const empty = byDay.every((d) => d.total === 0);

  return (
    <section className="rounded-card border border-line bg-card p-6 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl">Where everyone is</h2>
        <div className="flex gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-bar-ok" aria-hidden="true" /> On track
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-stuck" aria-hidden="true" /> Stuck
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">Active developers on each onboarding day.</p>

      {empty ? (
        <p className="py-16 text-center text-sm text-muted">Nobody is onboarding right now.</p>
      ) : (
        <div className="mt-6">
          {/* Plot: 7 columns sharing one baseline */}
          <div className="flex h-52 items-end gap-2 border-b border-line sm:gap-4">
            {byDay.map((d) => {
              const onTrack = d.total - d.stuck;
              const label = `Day ${d.day}: ${d.total} developer${d.total === 1 ? '' : 's'}${d.stuck ? `, ${d.stuck} stuck` : ''}`;
              return (
                <div
                  key={d.day}
                  tabIndex={0}
                  role="img"
                  aria-label={label}
                  className="group relative flex h-full flex-1 flex-col justify-end outline-none"
                >
                  {/* Hover / focus tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-page group-hover:block group-focus:block">
                    {label}
                  </div>

                  {d.total > 0 && (
                    <p className="mb-1 text-center text-xs font-medium">
                      {d.total}
                      {d.stuck > 0 && <span className="text-stuck"> ({d.stuck})</span>}
                    </p>
                  )}
                  {/* The bar: height relative to the busiest day. Gap-0.5 = 2px between segments. */}
                  <div
                    className="mx-auto flex w-full max-w-14 flex-col gap-0.5 group-hover:opacity-85 group-focus:ring-2 group-focus:ring-primary/30"
                    style={{ height: `${(d.total / max) * 85}%` }}
                  >
                    {onTrack > 0 && <div className="flex-1 rounded-t bg-bar-ok" style={{ flexGrow: onTrack }} />}
                    {d.stuck > 0 && (
                      <div className={`flex-1 bg-stuck ${onTrack === 0 ? 'rounded-t' : ''}`} style={{ flexGrow: d.stuck }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* X-axis labels */}
          <div className="mt-2 flex gap-2 sm:gap-4">
            {byDay.map((d) => (
              <p key={d.day} className="flex-1 text-center text-xs text-muted">
                Day {d.day}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Attention({ attention, canSeeGaps }) {
  const { stuck, stuckTotal, questions, recentlyCompleted } = attention;
  const nothing = stuck.length === 0 && questions.length === 0 && recentlyCompleted.length === 0;

  return (
    <section className="rounded-card border border-line bg-card p-6 md:p-8">
      <h2 className="text-xl">Needs your attention</h2>

      {nothing && <p className="mt-4 text-sm text-muted">Nothing right now. Everyone is on track.</p>}

      {stuck.length > 0 && (
        <AttentionGroup
          title="Stuck"
          more={stuckTotal > stuck.length ? { to: '/developers?status=stuck', label: `View all ${stuckTotal}` } : null}
        >
          {stuck.map((dev) => (
            <li key={dev._id} className="flex items-center justify-between gap-3">
              <Link to={`/developers/${dev._id}`} className="min-w-0 truncate font-medium hover:underline">
                {dev.name}
              </Link>
              <span className="shrink-0 text-xs text-stuck">
                Day {dev.currentDay} · {dev.daysPending} day{dev.daysPending === 1 ? '' : 's'} waiting
              </span>
            </li>
          ))}
        </AttentionGroup>
      )}

      {questions.length > 0 && (
        <AttentionGroup
          title="Unanswered questions"
          more={canSeeGaps ? { to: '/knowledge-gaps', label: 'Knowledge gaps' } : null}
        >
          {questions.map((q) => (
            <li key={q.key}>
              <p className="line-clamp-2">{q.question}</p>
              <p className="mt-0.5 text-xs text-muted">
                Asked {q.count}× · last {formatDate(q.lastAskedAt)}
              </p>
            </li>
          ))}
        </AttentionGroup>
      )}

      {recentlyCompleted.length > 0 && (
        <AttentionGroup title="Recently finished">
          {recentlyCompleted.map((dev) => (
            <li key={dev._id} className="flex items-center justify-between gap-3">
              <Link to={`/developers/${dev._id}`} className="min-w-0 truncate font-medium hover:underline">
                {dev.name}
              </Link>
              <span className="shrink-0 text-xs text-muted">
                {formatDate(dev.finishedAt)} · {dev.daysToFinish} days
              </span>
            </li>
          ))}
        </AttentionGroup>
      )}
    </section>
  );
}

function AttentionGroup({ title, more, children }) {
  return (
    <div className="mt-5 border-t border-line pt-4 first-of-type:mt-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-sans text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
        {more && (
          <Link to={more.to} className="text-xs font-medium text-primary hover:underline">
            {more.label}
          </Link>
        )}
      </div>
      <ul className="mt-3 space-y-3 text-sm">{children}</ul>
    </div>
  );
}
