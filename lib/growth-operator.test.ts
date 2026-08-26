import { describe, expect, it } from 'vitest';
import { isGrowthOperator } from './growth-operator';

describe('growth operator access', () => {
  it('fails closed unless the authenticated User matches the configured operator', () => {
    expect(isGrowthOperator('owner-1', undefined)).toBe(false);
    expect(isGrowthOperator('owner-1', '')).toBe(false);
    expect(isGrowthOperator('owner-1', 'owner-2')).toBe(false);
    expect(isGrowthOperator('owner-1', 'owner-1')).toBe(true);
  });
});
