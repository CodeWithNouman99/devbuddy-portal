// /audit (admin only): every logged action, newest first, filterable by
// action type. Filter and page live in the URL (?action=&page=).
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../api.js';
import Alert from '../components/Alert.jsx';
import Pagination from '../components/Pagination.jsx';
import { formatDateTime } from '../lib/format.js';

const selectClass =
  'rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

// Actions that are worth a warning color in the tag
const WARN_ACTIONS = ['login_failed', 'account_locked', 'login_blocked_locked', 'login_blocked_inactive', 'welcome_webhook_failed', 'user_deactivated'];

// { email: "a@b.com", role: "hr" } -> "email: a@b.com · role: hr"
function formatDetails(details) {
  if (!details || typeof details !== 'object') return '';
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${value !== null && typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join(' · ');
}

export default function AuditLog() {
  const [params, setParams] = useSearchParams();
  const action = params.get('action') || '';
  const page = Number(params.get('page')) || 1;

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    const query = new URLSearchParams();
    if (action) query.set('action', action);
    if (page > 1) query.set('page', page);

    api(`/audit?${query}`)
      .then((result) => !ignore && setData(result))
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [action, page]);

  function setFilter(value) {
    setParams(value ? { action: value } : {}, { replace: true });
  }

  function goToPage(next) {
    const p = new URLSearchParams(params);
    if (next > 1) p.set('page', String(next));
    else p.delete('page');
    setParams(p);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Audit log</h1>
          <p className="mt-1 text-sm text-muted">Sign-ins, changes and bot activity, newest first.</p>
        </div>
        <select aria-label="Filter by action" value={action} onChange={(e) => setFilter(e.target.value)} className={selectClass}>
          <option value="">All actions</option>
          {data?.actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <Alert>{error}</Alert>
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-line bg-card">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-5 py-3 font-medium">Who</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Details</th>
              <th className="px-5 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-60' : ''}>
            {data?.items.map((entry) => (
              <tr key={entry._id} className="border-b border-line align-top last:border-b-0">
                <td className="whitespace-nowrap px-5 py-3.5 text-muted">{formatDateTime(entry.createdAt)}</td>
                <td className="px-5 py-3.5">
                  {entry.user ? (
                    <>
                      <p className="font-medium">{entry.user.name}</p>
                      <p className="text-xs text-muted">{entry.user.email}</p>
                    </>
                  ) : (
                    // No user = the n8n bot, or a failed login with an unknown email
                    <p className="text-muted">{entry.action.startsWith('bot.') ? 'DevBuddy bot' : 'Unknown'}</p>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 font-mono text-xs ${
                      WARN_ACTIONS.includes(entry.action) ? 'bg-warn-bg text-warn-text' : 'bg-page text-ink'
                    }`}
                  >
                    {entry.action}
                  </span>
                </td>
                <td className="max-w-sm px-5 py-3.5 text-xs break-words text-muted">{formatDetails(entry.details)}</td>
                <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-muted">{entry.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data && data.items.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-muted">No entries{action ? ' for this action' : ''}.</p>
        )}
        {!data && loading && <p className="px-5 py-12 text-center text-sm text-muted">Loading audit log…</p>}
      </div>

      <Pagination data={data} onPage={goToPage} />
    </div>
  );
}
