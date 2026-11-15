// /developers: searchable, filterable, paginated table of developers.
// Filters live in the URL (?q=&role=&status=&page=) so the back button and
// shared links keep them.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { DEV_ROLES, formatWhatsapp } from '../lib/format.js';

const STATUS_OPTIONS = [
  { value: 'on_track', label: 'On track' },
  { value: 'stuck', label: 'Stuck' },
  { value: 'completed', label: 'Completed' },
];

const selectClass =
  'rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

export default function Developers() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const role = params.get('role') || '';
  const status = params.get('status') || '';
  const page = Number(params.get('page')) || 1;

  const [search, setSearch] = useState(q); // what's typed in the box right now
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Change one filter and go back to page 1 (empty values are removed from the URL)
  function updateParams(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  }

  // Wait until the user stops typing for 300ms before searching
  useEffect(() => {
    if (search === q) return;
    const timer = setTimeout(() => updateParams({ q: search.trim() }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Load the developers whenever the filters in the URL change
  useEffect(() => {
    let ignore = false; // avoid showing an old response if filters changed meanwhile
    setLoading(true);
    setError('');

    const query = new URLSearchParams();
    if (q) query.set('q', q);
    if (role) query.set('role', role);
    if (status) query.set('status', status);
    if (page > 1) query.set('page', page);

    api(`/developers?${query}`)
      .then((result) => !ignore && setData(result))
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));

    return () => {
      ignore = true;
    };
  }, [q, role, status, page]);

  const canAdd = ['admin', 'hr'].includes(user.role);
  const hasFilters = q || role || status;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Developers</h1>
          <p className="mt-1 text-sm text-muted">
            {user.role === 'manager' ? 'Developers on your team.' : 'Everyone currently onboarding or finished.'}
          </p>
        </div>
        {canAdd && (
          <Link to="/developers/new" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-page hover:opacity-90">
            Add developer
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or number"
          aria-label="Search by name or WhatsApp number"
          className={`${selectClass} min-w-0 flex-1 basis-56`}
        />
        <select aria-label="Filter by role" value={role} onChange={(e) => updateParams({ role: e.target.value })} className={selectClass}>
          <option value="">All roles</option>
          {DEV_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select aria-label="Filter by status" value={status} onChange={(e) => updateParams({ status: e.target.value })} className={selectClass}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <Alert>{error}</Alert>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-card border border-line bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Developer</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Manager</th>
              <th className="px-5 py-3 font-medium">Progress</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-60' : ''}>
            {data?.items.map((dev) => (
              <tr key={dev._id} className="border-b border-line last:border-b-0">
                <td className="px-5 py-3.5">
                  <p className="flex items-center gap-2 font-medium">
                    {dev.name}
                    {dev.isDemo && (
                      <span
                        title="Demo data: the WhatsApp bot never messages this developer"
                        className="rounded-full border border-line bg-page px-2 py-px text-[11px] font-medium text-muted"
                      >
                        Demo
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">{formatWhatsapp(dev.whatsappNumber)}</p>
                </td>
                <td className="px-5 py-3.5">{dev.role}</td>
                <td className="px-5 py-3.5 text-muted">{dev.manager?.name || 'Not assigned'}</td>
                <td className="px-5 py-3.5">
                  <ProgressBar days={dev.days} />
                  <p className="mt-1 text-xs text-muted">
                    {dev.progressStatus === 'completed' ? 'All 7 days' : `Day ${dev.currentDay} of 7`}
                  </p>
                </td>
                <td className="px-5 py-3.5"><StatusPill status={dev.progressStatus} /></td>
                <td className="px-5 py-3.5 text-right">
                  <Link to={`/developers/${dev._id}`} className="font-medium text-primary hover:underline">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data && data.items.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="font-medium">{hasFilters ? 'No developers match these filters.' : 'No developers yet.'}</p>
            <p className="mt-1 text-sm text-muted">
              {hasFilters ? 'Try a different search or clear the filters.' : canAdd ? 'Add the first one to start their onboarding.' : 'They will appear here once HR adds them.'}
            </p>
          </div>
        )}
        {!data && loading && <p className="px-5 py-12 text-center text-sm text-muted">Loading developers…</p>}
      </div>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <p>
            {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={data.page <= 1}
              onClick={() => updateParams({ page: data.page - 1 > 1 ? String(data.page - 1) : '' })}
              className="rounded-lg border border-line bg-card px-3 py-1.5 font-medium text-ink disabled:opacity-40"
            >
              Previous
            </button>
            <span>Page {data.page} of {data.totalPages}</span>
            <button
              disabled={data.page >= data.totalPages}
              onClick={() => updateParams({ page: String(data.page + 1) })}
              className="rounded-lg border border-line bg-card px-3 py-1.5 font-medium text-ink disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
