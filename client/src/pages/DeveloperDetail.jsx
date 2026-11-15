// /developers/:id: header, 7-day timeline and questions for one developer.
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { api } from '../api.js';
import Alert from '../components/Alert.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { DAY_COLORS } from '../components/ProgressBar.jsx';
import { formatDate, formatDateTime, formatWhatsapp, initials } from '../lib/format.js';

const STATE_LABELS = { done: 'Done', current: 'In progress', stuck: 'Stuck', upcoming: 'Upcoming' };

export default function DeveloperDetail() {
  const { id } = useParams();
  const location = useLocation();
  const warning = location.state?.warning; // set by the Add developer page

  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    setData(null);
    setError('');
    api(`/developers/${id}`)
      .then((result) => !ignore && setData(result))
      .catch((err) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl">
        <BackLink />
        <div className="mt-4"><Alert>{error}</Alert></div>
      </div>
    );
  }

  if (!data) return <p className="text-sm text-muted">Loading…</p>;

  const { developer, timeline, questions } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink />
      <Alert>{warning}</Alert>

      {/* Header */}
      <section className="flex flex-wrap items-start gap-5 rounded-card border border-line bg-card p-6 md:p-8">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-primary font-serif text-xl font-semibold text-page">
          {initials(developer.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl">{developer.name}</h1>
            <StatusPill status={developer.progressStatus} />
          </div>
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <Info label="Role" value={developer.role} />
            <Info label="WhatsApp" value={formatWhatsapp(developer.whatsappNumber)} />
            <Info label="Joined" value={formatDate(developer.joinDate)} />
            <Info label="Manager" value={developer.manager?.name || 'Not assigned'} />
          </dl>
        </div>
      </section>

      {/* Timeline */}
      <section className="rounded-card border border-line bg-card p-6 md:p-8">
        <h2 className="text-xl">7-day plan</h2>
        <ol className="mt-5">
          {timeline.map((item, i) => (
            <li key={item.taskId} className="relative flex gap-4 pb-6 last:pb-0">
              {/* vertical line between markers */}
              {i < timeline.length - 1 && <span className="absolute top-6 left-[11px] h-full w-0.5 bg-seg-upcoming" aria-hidden="true" />}
              <span className={`relative z-10 mt-0.5 size-6 shrink-0 rounded-full ring-4 ring-card ${DAY_COLORS[item.state]}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-medium">
                    Day {item.day} <span className="text-muted">·</span> {item.title}
                  </p>
                  <p className={`text-xs font-medium ${item.state === 'stuck' ? 'text-stuck' : 'text-muted'}`}>
                    {STATE_LABELS[item.state]}
                  </p>
                </div>
                {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
                <p className="mt-1 text-xs text-muted">
                  {item.completedAt
                    ? `Completed ${formatDateTime(item.completedAt)}`
                    : item.assignedAt
                      ? `Assigned ${formatDateTime(item.assignedAt)}`
                      : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
        {timeline.length === 0 && <p className="mt-4 text-sm text-muted">No onboarding tasks found. Run the seed script to create them.</p>}
      </section>

      {/* Questions */}
      <section className="rounded-card border border-line bg-card p-6 md:p-8">
        <h2 className="text-xl">Questions</h2>
        {questions.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-line px-4 py-8 text-center">
            <p className="font-medium">No questions yet</p>
            <p className="mt-1 text-sm text-muted">Questions {developer.name.split(' ')[0]} asks DevBuddy on WhatsApp will show up here.</p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {questions.map((q) => (
              <li key={q._id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{q.question}</p>
                  <p className="text-xs text-muted">{formatDateTime(q.askedAt)}</p>
                </div>
                {q.answer ? (
                  <p className="mt-1.5 text-sm text-muted">{q.answer}</p>
                ) : (
                  <p className="mt-1.5 text-sm italic text-muted">No answer yet.</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Tag tone={q.foundInDocs ? 'ok' : 'warn'}>{q.foundInDocs ? 'Found in docs' : 'Not in docs'}</Tag>
                  <Tag tone={q.resolved ? 'ok' : 'warn'}>{q.resolved ? 'Resolved' : 'Open'}</Tag>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/developers" className="text-sm text-muted hover:text-ink">
      Back to developers
    </Link>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Tag({ tone, children }) {
  const className = tone === 'ok' ? 'bg-ok-bg text-primary' : 'bg-warn-bg text-warn-text';
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}
