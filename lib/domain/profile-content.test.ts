import { describe, expect, it } from 'vitest';
import { normalizeManualProfilePatch, normalizeReviewedProfilePatch, normalizeServices } from './profile-content';

describe('profile content', () => {
  it('normalizes service aliases, deduplicates case-insensitively, and prunes details', () => {
    const result = normalizeReviewedProfilePatch({
      services: [' dog walking ', 'Dog Walking', 'Drop-In Visits'],
      serviceDetails: {
        'dog walking': { description: ' A calm neighborhood walk. ', startingPrice: '$25', billingUnit: 'per walk' },
        'not selected': { description: 'No' }
      }
    });
    expect(result).toEqual({
      services: ['Dog walking', 'Drop-in visits'],
      serviceDetails: { 'Dog walking': { description: 'A calm neighborhood walk.', startingPrice: '$25', billingUnit: 'per walk' } }
    });
  });

  it('keeps empty imported values out while manual values may intentionally clear', () => {
    expect(normalizeReviewedProfilePatch({ about: '   ', services: [] })).toEqual({});
    expect(normalizeManualProfilePatch({ about: '   ', services: [] })).toEqual({ about: '', services: [], serviceDetails: {} });
  });

  it('enforces central rich-content bounds and excludes URLs and email addresses', () => {
    expect(() => normalizeReviewedProfilePatch({ about: 'a'.repeat(3001) })).toThrow();
    expect(() => normalizeReviewedProfilePatch({ careRoutine: 'a'.repeat(1501) })).toThrow();
    expect(() => normalizeReviewedProfilePatch({ about: 'Reach me at sitter@example.com' })).toThrow();
    expect(() => normalizeReviewedProfilePatch({ petPreferences: 'See https://example.com' })).toThrow();
  });

  it('limits services to eight without losing unknown visible service names', () => {
    expect(normalizeServices(['Boarding', 'House Sitting', 'Drop-In Visits', 'Dog Walking', 'Doggy Day Care', 'Cat naps', 'One', 'Two', 'Ignored'])).toEqual([
      'Boarding', 'House sitting', 'Drop-in visits', 'Dog walking', 'Doggy day care', 'Cat naps', 'One', 'Two'
    ]);
  });

  it('does not admit Rover reviews or testimonials into an importable profile patch', () => {
    expect(normalizeReviewedProfilePatch({
      about: 'Visible sitter biography',
      reviews: [{ text: 'Marketplace review', source: 'Rover' }],
      testimonials: [{ text: 'Imported praise', permissionAttested: true }]
    })).toEqual({ about: 'Visible sitter biography' });
  });
});
