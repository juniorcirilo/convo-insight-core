export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return 'menos de 1 minuto';
  }

  if (minutes < 60) {
    const m = Math.round(minutes);
    return `${m} minuto${m !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (remainingMinutes === 0) {
    return `${hours} hora${hours !== 1 ? 's' : ''}`;
  }

  return `${hours}h ${remainingMinutes}min`;
}
