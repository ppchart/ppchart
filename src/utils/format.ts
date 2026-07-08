export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function formatCount(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)} 万`;
  }

  return new Intl.NumberFormat('zh-CN').format(value);
}

export function normalizeCode(value: string | undefined): string {
  if (!value) {
    return '';
  }

  return value.trim();
}
