export function formatCurrency(val: number | string | null | undefined): string {
  const num = Number(val ?? 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function extractErrorMessage(err: any, fallback: string): string {
  const msg = err?.response?.data?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
}
