// Returns a Date at 00:00:00.000 UTC, or null if the input is not a real calendar date
const normalizeDate = (input) => {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;

  const date = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;

  // Rejects impossible dates like 2026-02-31, which JavaScript would roll over
  if (date.toISOString().slice(0, 10) !== input) return null;

  return date;
};

module.exports = normalizeDate;