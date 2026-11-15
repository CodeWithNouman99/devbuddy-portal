// /knowledge-gaps: questions the AI couldn't answer from the docs, grouped by
// text. "Mark fixed" = the docs now cover it (all questions in the group
// become resolved). Managers only see their own team's questions.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import KpiCard from '../components/KpiCard.jsx';
import { formatDateTime } from '../lib/format.js';

export default function KnowledgeGaps() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [fixing, setFixing] = useState(null); // key of the group being saved

  function load() {
    return api('/questions/gaps')
      .then(setData)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function markFixed(gap) {
    setError('');
    setFixing(gap.key);
    try {
      await api('/questions/gaps/resolve', { method: 'PATCH', body: { key: gap.key } });
    } catch (err) {
      setError(err.message);
    }
    await load(); // refresh the list and the KPI numbers either way
    setFixing(null);
  }

  const { kpis, gaps } = data || {};

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl">Knowledge gaps</h1>
      <p className="mt-1 text-sm text-muted">
        Questions DevBuddy couldn't answer from the docs
        {user.role === 'manager' ? ', asked by your team' : ''}. Add the answer to the docs, then mark it fixed.
      </p>

      <div className="mt-4">
        <Alert>{error}</Alert>
      </div>

      {!data && !error && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {data && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <KpiCard label="Questions asked" value={kpis.asked30Days} hint="Last 30 days" />
            <KpiCard
              label="Answered from docs"
              value={kpis.answeredFromDocsPct === null ? '–' : `${kpis.answeredFromDocsPct}%`}
              hint="Last 30 days"
            />
            <KpiCard label="Open gaps" value={kpis.openGaps} hint="Different questions to fix" tone={kpis.openGaps > 0 ? 'warn' : undefined} />
          </div>

          <div className="mt-6 overflow-x-auto rounded-card border border-line bg-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Question</th>
                  <th className="px-5 py-3 font-medium">Times asked</th>
                  <th className="px-5 py-3 font-medium">Last asked</th>
                  <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((gap) => (
                  <tr key={gap.key} className="border-b border-line last:border-b-0">
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{gap.question}</p>
                      <p className="text-xs text-muted">
                        {gap.developerCount} developer{gap.developerCount === 1 ? '' : 's'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">{gap.count}</td>
                    <td className="px-5 py-3.5 text-muted">{formatDateTime(gap.lastAskedAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => markFixed(gap)}
                        disabled={fixing !== null}
                        className="whitespace-nowrap rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-page disabled:opacity-50"
                      >
                        {fixing === gap.key ? 'Saving…' : 'Mark fixed'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {gaps.length === 0 && (
              <div className="px-5 py-12 text-center">
                <p className="font-medium">No open gaps.</p>
                <p className="mt-1 text-sm text-muted">Every question so far was answered from the docs or marked fixed.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
