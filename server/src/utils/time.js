// Date helpers in Pakistan time (Asia/Karachi).
// Pakistan is always UTC+5 (no daylight saving), which keeps this simple.
const TIME_ZONE = 'Asia/Karachi';
const UTC_OFFSET = '+05:00';
const DAY_MS = 24 * 60 * 60 * 1000;

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// The calendar date in Pakistan, as "2026-11-14".
// (Strings in this format can be compared with < and >.)
function karachiDate(date = new Date()) {
  return formatter.format(new Date(date));
}

// The moment Pakistan's day "2026-11-14" starts, as a normal Date.
function startOfKarachiDay(dateString) {
  return new Date(`${dateString}T00:00:00${UTC_OFFSET}`);
}

// Whole calendar days between two Pakistan dates.
// e.g. assigned "2026-11-12", today "2026-11-14" -> 2
// Counting calendar days (not hours) means a task assigned at 9:00:03
// yesterday still counts as "1 day" when the job runs at 9:00:01 today.
function karachiDaysBetween(fromDateString, toDateString) {
  const from = Date.parse(`${fromDateString}T00:00:00Z`);
  const to = Date.parse(`${toDateString}T00:00:00Z`);
  return Math.round((to - from) / DAY_MS);
}

module.exports = { TIME_ZONE, DAY_MS, karachiDate, startOfKarachiDay, karachiDaysBetween };
