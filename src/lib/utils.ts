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

/**
 * Sort actions: active first (preserving insertion / manual order), then completed (newest first).
 * Active items are NOT re-sorted by priority — this preserves drag-and-drop reorder.
 * Priority / due-date sorting is intentionally left to the UI display layer.
 */
export function sortActions<T extends { completed: boolean; priority: string; dueDate: string | null; createdAt: number }>(items: T[]): T[] {
  const active = items.filter((i) => !i.completed);
  const done = items
    .filter((i) => i.completed)
    .sort((a, b) => b.createdAt - a.createdAt);

  return [...active, ...done];
}
