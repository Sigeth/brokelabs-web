/** A date and time in the viewer's locale and time zone, e.g. "21 Nov 2026, 14:00". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** True when the date has passed. */
export function isPast(iso: string | null | undefined): boolean {
  return !!iso && new Date(iso).getTime() < Date.now();
}
