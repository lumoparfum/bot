export function formatPrice(price: number): string {
  return `${price.toLocaleString('tr-TR')} ₺`;
}

// Yazarken canli binlik ayirac gostermek icin - raw rakam dizisini
// (ornegin "3250000") "3.250.000" seklinde formatlar. Depolanan deger hep
// saf rakam kalir, bu sadece goruntuleme amaçlı.
export function formatNumberInput(digits: string): string {
  if (!digits) return '';
  return Number(digits).toLocaleString('tr-TR');
}

export function formatRelativeDate(millis: number): string {
  const diffMs = Date.now() - millis;
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (diffMinutes < 1) return 'Az önce';
  if (diffMinutes < 60) return `${diffMinutes} dakika önce`;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  return new Date(millis).toLocaleDateString('tr-TR');
}

export function formatAccountAge(createdAt: number): string {
  const days = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
  if (days < 1) return 'Bugün katıldı';
  if (days < 30) return `${days} gündür üye`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} aydır üye`;
  const years = Math.floor(days / 365);
  return `${years} yıldır üye`;
}

export function formatLastActive(lastActiveAt: number): string {
  const diffMs = Date.now() - lastActiveAt;
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 1) return 'Az önce aktifti';
  if (diffHours < 24) return 'Bugün aktifti';
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Dün aktifti';
  if (diffDays < 7) return `${diffDays} gün önce aktifti`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce aktifti`;
  return `${Math.floor(diffDays / 30)} ay önce aktifti`;
}
