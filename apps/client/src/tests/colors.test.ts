import { describe, expect, it } from 'vitest';
import { colorForUserId, colorLightForUserId, classesForUserId } from '../lib/colors';

describe('colorForUserId', () => {
  it('returns a hex color string', () => {
    expect(colorForUserId('abc')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns the same color for the same userId', () => {
    expect(colorForUserId('user1')).toBe(colorForUserId('user1'));
  });

  it('returns different colors for different userIds', () => {
    expect(colorForUserId('user1')).not.toBe(colorForUserId('user2'));
  });

  it('returns a translucent light color for selections', () => {
    expect(colorLightForUserId('abc')).toMatch(/^#[0-9a-f]{8}$/i);
  });
});

describe('classesForUserId', () => {
  it('returns an object with bg, text, border, ring keys', () => {
    const classes = classesForUserId('user123');
    expect(classes).toHaveProperty('bg');
    expect(classes).toHaveProperty('text');
    expect(classes).toHaveProperty('border');
    expect(classes).toHaveProperty('ring');
  });

  it('returns Tailwind class strings prefixed correctly', () => {
    const classes = classesForUserId('user123');
    expect(classes.bg).toMatch(/^bg-user-/);
    expect(classes.text).toMatch(/^text-user-/);
    expect(classes.border).toMatch(/^border-user-/);
    expect(classes.ring).toMatch(/^ring-user-/);
  });

  it('returns consistent classes for the same userId', () => {
    expect(classesForUserId('abc')).toEqual(classesForUserId('abc'));
  });

  it('returns different classes for different userIds (at least sometimes)', () => {
    const results = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => classesForUserId(id).bg),
    );
    expect(results.size).toBeGreaterThan(1);
  });
});
