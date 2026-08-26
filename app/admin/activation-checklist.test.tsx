import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ActivationChecklist } from './activation-checklist';
import { activationChecklist, nextActivationItem } from './activation-model';

describe('activation checklist view', () => {
  it('shows sharing as the next setup action until durable evidence exists', () => {
    const items = activationChecklist({ sites: [{ onboardingCompletedAt: 1 }], leads: [], conversationMessages: {}, paymentSetup: [], clientHouseholds: [], bookings: [], growthActivation: { setupActivated: false, valueActivated: false } });
    const html = renderToStaticMarkup(<ActivationChecklist items={items} next={nextActivationItem(items)} onOpenTab={vi.fn()} />);

    expect(html).toContain('Your next activation step');
    expect(html).toContain('Share your live site to complete setup activation.');
    expect(html).toContain('href="#share-site"');
  });
});
