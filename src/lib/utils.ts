/* Ambiguity-free character set (no 0/O, 1/I/L) */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Generate a random 8-character invite code */
export function generateInviteCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

/** Normalize a raw invite code: strip dashes/spaces, uppercase */
export function normalizeInviteCode(raw: string): string {
  return raw.replace(/[-\s]/g, '').toUpperCase();
}

/** Sort items: active first (preserving insertion order), then completed (by createdAt) */
export function sortItems<T extends { completed: boolean; createdAt: number }>(items: T[]): T[] {
  const active = items.filter((i) => !i.completed);
  const done = items
    .filter((i) => i.completed)
    .sort((a, b) => a.createdAt - b.createdAt);
  return [...active, ...done];
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** Sort actions: active first (by priority → due date → created), then completed (newest first) */
export function sortActions<T extends { completed: boolean; priority: string; dueDate: string | null; createdAt: number }>(items: T[]): T[] {
  const active = items.filter((i) => !i.completed);
  const done = items
    .filter((i) => i.completed)
    .sort((a, b) => b.createdAt - a.createdAt);

  active.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 3;
    const pb = PRIORITY_ORDER[b.priority] ?? 3;
    if (pa !== pb) return pa - pb;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.createdAt - b.createdAt;
  });

  return [...active, ...done];
}
