const parisDay = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Jour calendaire à Paris au format AAAA-MM-JJ (le menu change chaque jour). */
export function parisDate(date: Date = new Date()): string {
  return parisDay.format(date);
}

/** Bornes UTC [début, fin[ d'une journée parisienne AAAA-MM-JJ. */
export function parisDayRange(day: string): { start: Date; end: Date } {
  const [y, m, d] = day.split('-').map(Number);
  // On part de midi UTC pour retrouver le décalage horaire Paris de ce jour-là (heure d'été/hiver).
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12));
  const parisNoon = new Date(noonUtc.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const utcNoon = new Date(noonUtc.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs = parisNoon.getTime() - utcNoon.getTime();
  const start = new Date(Date.UTC(y, m - 1, d) - offsetMs);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
