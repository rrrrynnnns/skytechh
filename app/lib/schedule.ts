export function normalizeScheduleTime(value: string | null | undefined) {
  if (!value) return '';
  if (value === '09:00') return '9:00 AM – 12:00 NN';
  if (value === '13:00') return '1:00 PM – 4:00 PM';
  return value;
}

export function getScheduleDayRange(value: string) {
  const start = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}
