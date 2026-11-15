// "1–25 of 80   Previous  Page 1 of 4  Next" under a table.
// data = { page, pageSize, total, totalPages } from the API.
export default function Pagination({ data, onPage }) {
  if (!data || data.total === 0) return null;
  const button = 'rounded-lg border border-line bg-card px-3 py-1.5 font-medium text-ink disabled:opacity-40';
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted">
      <p>
        {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
      </p>
      <div className="flex items-center gap-2">
        <button disabled={data.page <= 1} onClick={() => onPage(data.page - 1)} className={button}>
          Previous
        </button>
        <span>Page {data.page} of {data.totalPages}</span>
        <button disabled={data.page >= data.totalPages} onClick={() => onPage(data.page + 1)} className={button}>
          Next
        </button>
      </div>
    </div>
  );
}
