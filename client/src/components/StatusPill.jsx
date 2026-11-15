// "On track" / "Stuck" / "Completed" badge.
const STYLES = {
  on_track: { label: 'On track', className: 'bg-ok-bg text-primary' },
  stuck: { label: 'Stuck', className: 'bg-warn-bg text-warn-text' },
  completed: { label: 'Completed', className: 'bg-primary text-page' },
};

export default function StatusPill({ status }) {
  const style = STYLES[status] || STYLES.on_track;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}
