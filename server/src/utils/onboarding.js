// Rules for "how is this developer doing?", used by the list and detail pages.

// A developer is "stuck" when their current day's task has been pending for
// more than this long since it was assigned.
const STUCK_AFTER_MS = 24 * 60 * 60 * 1000; // 1 day

// currentProgress = the Progress row for the developer's currentDay (or undefined)
function isStuck(developer, currentProgress, now = Date.now()) {
  if (developer.status === 'completed' || !currentProgress) return false;
  if (currentProgress.status !== 'pending') return false;
  return now - new Date(currentProgress.assignedAt).getTime() > STUCK_AFTER_MS;
}

// The status pill: "completed" | "stuck" | "on_track"
function progressStatus(developer, stuck) {
  if (developer.status === 'completed') return 'completed';
  return stuck ? 'stuck' : 'on_track';
}

// State of one day: "done" | "current" | "stuck" | "upcoming"
function dayState(day, developer, progressForDay, stuck) {
  if (developer.status === 'completed') return 'done';
  if (progressForDay?.status === 'done') return 'done';
  if (day < developer.currentDay) return 'done'; // they already moved past it
  if (day === developer.currentDay) return stuck ? 'stuck' : 'current';
  return 'upcoming';
}

// The 7 segments of the progress bar, e.g. ["done","done","current","upcoming",...]
function dayStates(developer, progressList, stuck) {
  const states = [];
  for (let day = 1; day <= 7; day++) {
    const progressForDay = progressList.find((p) => p.day === day);
    states.push(dayState(day, developer, progressForDay, stuck));
  }
  return states;
}

module.exports = { STUCK_AFTER_MS, isStuck, progressStatus, dayState, dayStates };
