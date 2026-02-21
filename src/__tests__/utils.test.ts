import { describe, it, expect } from 'vitest';
import { generateInviteCode, normalizeInviteCode, sortItems } from '../lib/utils';

const VALID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

describe('generateInviteCode', () => {
  it('returns an 8-character string', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
  });

  it('only contains ambiguity-free characters (no 0/O/1/I/L)', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      for (const ch of code) {
        expect(VALID_CHARS).toContain(ch);
      }
    }
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateInviteCode()));
    expect(codes.size).toBe(50);
  });
});

describe('normalizeInviteCode', () => {
  it('uppercases letters', () => {
    expect(normalizeInviteCode('abcdefgh')).toBe('ABCDEFGH');
  });

  it('strips dashes', () => {
    expect(normalizeInviteCode('ABCD-EFGH')).toBe('ABCDEFGH');
  });

  it('strips spaces', () => {
    expect(normalizeInviteCode('ABCD EFGH')).toBe('ABCDEFGH');
  });

  it('handles mixed input', () => {
    expect(normalizeInviteCode('ab-cd ef-gh')).toBe('ABCDEFGH');
  });
});

describe('sortItems', () => {
  it('puts active items first, then completed sorted by createdAt', () => {
    const items = [
      { completed: true, createdAt: 300 },
      { completed: false, createdAt: 200 },
      { completed: true, createdAt: 100 },
      { completed: false, createdAt: 400 },
    ];
    const sorted = sortItems(items);
    expect(sorted).toEqual([
      { completed: false, createdAt: 200 },
      { completed: false, createdAt: 400 },
      { completed: true, createdAt: 100 },
      { completed: true, createdAt: 300 },
    ]);
  });

  it('preserves insertion order for active items', () => {
    const items = [
      { completed: false, createdAt: 999 },
      { completed: false, createdAt: 1 },
      { completed: false, createdAt: 500 },
    ];
    const sorted = sortItems(items);
    expect(sorted.map((i) => i.createdAt)).toEqual([999, 1, 500]);
  });

  it('handles empty array', () => {
    expect(sortItems([])).toEqual([]);
  });

  it('handles all completed', () => {
    const items = [
      { completed: true, createdAt: 300 },
      { completed: true, createdAt: 100 },
    ];
    const sorted = sortItems(items);
    expect(sorted.map((i) => i.createdAt)).toEqual([100, 300]);
  });
});
