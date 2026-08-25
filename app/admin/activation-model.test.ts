import { describe, expect, it } from 'vitest';
import { activationChecklist, nextActivationItem } from './activation-model';

const base = {
  sites: [{ onboardingCompletedAt: 1 }],
  leads: [],
  conversationMessages: {},
  paymentSetup: [{ status: 'not_started' }],
  clientHouseholds: [],
  bookings: []
};

describe('activation checklist', () => {
  it('keeps setup and provider progress honest for an empty workspace', () => {
    const items = activationChecklist(base);

    expect(items.find((item) => item.id === 'site-setup')?.complete).toBe(true);
    expect(items.find((item) => item.id === 'connect-stripe')?.complete).toBe(false);
    expect(items.find((item) => item.id === 'share-site')?.complete).toBe(false);
    expect(nextActivationItem(items)?.id).toBe('connect-stripe');
  });

  it('links incomplete setup to the site editor', () => {
    const items = activationChecklist({ ...base, sites: [{ onboardingCompletedAt: null }] });

    expect(items.find((item) => item.id === 'site-setup')?.destination).toEqual({ kind: 'anchor', href: '#site-editor' });
  });

  it('surfaces the next useful work from partially activated data', () => {
    const items = activationChecklist({
      ...base,
      leads: [{ id: 'lead-1', status: 'NEW' }],
      conversationMessages: {},
      paymentSetup: [{ status: 'ready' }]
    });

    expect(nextActivationItem(items)?.id).toBe('respond-to-inquiry');
    expect(items.find((item) => item.id === 'save-client')?.detail).toContain('Qualify an inquiry first');
  });

  it('marks existing reply, client, and booking evidence complete', () => {
    const items = activationChecklist({
      ...base,
      leads: [{ id: 'lead-1', status: 'QUALIFIED' }],
      conversationMessages: { 'lead-1': [{ sender: 'SITTER' }] },
      paymentSetup: [{ status: 'ready' }],
      clientHouseholds: [{}],
      bookings: [{}]
    });

    expect(items.filter((item) => item.id !== 'share-site').every((item) => item.complete)).toBe(true);
    expect(nextActivationItem(items)?.id).toBe('share-site');
  });
});
