// 7 small segments, one per onboarding day.
// days = ["done", "done", "current", "upcoming", ...] (from the API)
export const DAY_COLORS = {
  done: 'bg-primary',
  current: 'bg-seg-current',
  stuck: 'bg-stuck',
  upcoming: 'bg-seg-upcoming',
};

export default function ProgressBar({ days }) {
  const doneCount = days.filter((d) => d === 'done').length;
  return (
    <div className="flex w-36 gap-1" role="img" aria-label={`${doneCount} of 7 days done`}>
      {days.map((state, i) => (
        <span key={i} title={`Day ${i + 1}: ${state}`} className={`h-2 flex-1 rounded-full ${DAY_COLORS[state]}`} />
      ))}
    </div>
  );
}
