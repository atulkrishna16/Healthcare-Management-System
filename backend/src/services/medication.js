const dayjs = require('dayjs');

const FREQ_MAP = [
  { keywords: ['twice', '2 times', 'bd', 'bid', 'every 12 hours'], hours: [8, 20] },
  { keywords: ['three times', '3 times', 'tid', 'tds', 'every 8 hours'], hours: [8, 16, 24] },
  { keywords: ['four times', '4 times', 'qid', 'every 6 hours'], hours: [6, 12, 18, 24] },
  { keywords: ['before meal', 'before food'], hours: [7, 13, 19] },
  { keywords: ['after meal', 'after food'], hours: [9, 14, 21] },
  { keywords: ['morning'], hours: [8] },
  { keywords: ['night', 'bedtime'], hours: [21] },
];

/**
 * Parse prescription frequency into concrete datetimes.
 */
function parseFrequencyToOccurrences(frequency, durationDays) {
  const freq = frequency.toLowerCase().trim();
  const occurrences = [];
  const now = dayjs().startOf('day');

  if (freq.includes('weekly')) {
    for (let day = 0; day < durationDays; day += 7) {
      occurrences.push(now.add(day + 1, 'day').hour(8).toDate());
    }
    return occurrences.filter((d) => d > new Date());
  }

  const match = FREQ_MAP.find((entry) => entry.keywords.some((k) => freq.includes(k)));
  const hours = match ? match.hours : [8]; // default 8am

  for (let day = 0; day < Math.min(durationDays, 90); day++) {
    for (const hour of hours) {
      occurrences.push(now.add(day + 1, 'day').hour(hour % 24).minute(0).second(0).toDate());
    }
  }

  return occurrences.filter((d) => d > new Date());
}

module.exports = { parseFrequencyToOccurrences };
