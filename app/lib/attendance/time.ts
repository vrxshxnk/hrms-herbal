const IST_OFFSET = "+05:30";

export function attendanceTimestamp(date: string, time: string | null, nextDay = false): string | null {
  if (!time) return null;
  const day = nextDay
    ? new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
    : date;
  return `${day}T${time.length === 5 ? `${time}:00` : time}${IST_OFFSET}`;
}

export function isOvernight(checkIn: string | null, checkOut: string | null): boolean {
  return Boolean(checkIn && checkOut && checkOut < checkIn);
}

// The provider writes eight hours and 54 minutes as 8.54, not 8.54 decimal hours.
export function hoursMinutesToDecimal(value: unknown): number {
  if (value === null || value === undefined || String(value).trim() === "") return 0;
  const text = String(value).trim();
  if (!/^\d{1,2}(?:\.\d{1,2})?$/.test(text)) throw new Error(`Invalid H.MM hours value: ${text}`);
  const [hoursText, minutesText = "0"] = text.split(".");
  const hours = Number(hoursText);
  const minutes = Number(minutesText.padEnd(2, "0"));
  if (minutes >= 60 || hours > 24 || (hours === 24 && minutes > 0)) {
    throw new Error(`Invalid H.MM hours value: ${text}`);
  }
  return Number((hours + minutes / 60).toFixed(2));
}
