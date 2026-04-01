export function generateId(prefix = 'id'): string {
  const timestamp = Date.now().toString(36);
  const array = new Uint32Array(2);
  window.crypto.getRandomValues(array);
  const random = Array.from(array, (n) => n.toString(36)).join('');
  return `${prefix}-${timestamp}-${random}`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseStringToArray(str: string): string[] {
  return str
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU');
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
