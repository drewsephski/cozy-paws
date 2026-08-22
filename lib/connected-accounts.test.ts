import { describe, expect, it } from 'vitest';
import { buildConnectedAccountParams, statementDescriptorForBusiness } from './connected-accounts';

describe('Stripe connected-account prefill', () => {
  it('classifies pet-care businesses before hosted onboarding', () => {
    const params = buildConnectedAccountParams({
      id: 'business-1',
      name: 'Cozy Paws',
      email: 'sitter@example.com',
    });

    expect(params.configuration?.merchant?.mcc).toBe('7299');
    expect(params.configuration?.merchant?.statement_descriptor).toEqual({ descriptor: 'COZY PAWS', prefix: 'COZY PAWS' });
    expect(params.defaults?.profile?.product_description).toBe('Independent pet sitting and pet-care services.');
  });

  it('builds Stripe-safe descriptors from the sitter business name', () => {
    expect(statementDescriptorForBusiness(`Léa's <Happy> Paws & Walks`)).toEqual({
      descriptor: 'LEA S HAPPY PAWS WALKS',
      prefix: 'LEA S HAPP',
    });
    expect(statementDescriptorForBusiness('P')).toEqual({ descriptor: 'P PET CARE', prefix: 'P PET CARE' });
  });
});
