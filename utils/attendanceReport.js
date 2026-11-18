const summarize = (records) => {
  const counts = { present: 0, absent: 0, late: 0, leave: 0 };

  for (const r of records) {
    const key = r.status.toLowerCase(); // "Present" -> "present"
    if (key in counts) counts[key] += 1;
  }

  const total = records.length;
  const attended = counts.present + counts.late;
  const counted = total - counts.leave; 

  const attendancePercentage =
    counted > 0 ? Number(((attended / counted) * 100).toFixed(2)) : null;

  return { ...counts, total, attended, counted, attendancePercentage };
};

module.exports = { summarize };