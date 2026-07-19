export function formatPrice(price: number): string {
  return `${price.toLocaleString('tr-TR')} ₺`;
}

export function formatRelativeDate(millis: number): string {
  const diffMs = Date.now() - millis;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Az önce';
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  return new Date(millis).toLocaleDateString('tr-TR');
}
