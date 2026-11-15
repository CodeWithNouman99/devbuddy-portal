// One number in a KPI strip: label, big value, optional short hint.
export default function KpiCard({ label, value, hint, tone }) {
  return (
    <div className="rounded-card border border-line bg-card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 font-serif text-3xl font-semibold ${tone === 'warn' ? 'text-stuck' : ''}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
