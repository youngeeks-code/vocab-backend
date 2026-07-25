const NEGLECT_USE_COUNT_THRESHOLD = 5; // research-backed: 5-7 retrievals before a word is "known"
const NEGLECT_DAYS_THRESHOLD = 3;

function daysSince(date) {
  if (!date) return Infinity;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

// Priority flag is a manual override — if set, the word is due no matter what.
function isDue(word) {
  if (word.priority) return true;
  return word.useCount < NEGLECT_USE_COUNT_THRESHOLD && daysSince(word.lastUsed) > NEGLECT_DAYS_THRESHOLD;
}

// Priority words first, then least-used, then longest-neglected.
function sortByPriorityThenNeglect(words) {
  return [...words].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    if (a.useCount !== b.useCount) return a.useCount - b.useCount;
    return daysSince(b.lastUsed) - daysSince(a.lastUsed);
  });
}

module.exports = { daysSince, isDue, sortByPriorityThenNeglect };
