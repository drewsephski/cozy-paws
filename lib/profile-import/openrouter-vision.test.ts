import { describe, expect, it, vi } from 'vitest';
import { createOpenRouterVision, VISION_SYSTEM_PROMPT } from './openrouter-vision';

describe('OpenRouter vision', () => {
  it('uses structured Gemini output with no retry, no fallback, data denial, and ZDR', async () => {
    const generate = vi.fn().mockResolvedValue({ output: {
      sitterName: { value: 'Jamie', confidence: 'high', visibleEvidence: 'Jamie', unknownReason: null },
      businessName: { value: null, confidence: 'low', visibleEvidence: null, unknownReason: 'Not shown' },
      tagline: { value: null, confidence: 'low', visibleEvidence: null, unknownReason: 'Not shown' },
      location: { value: null, confidence: 'low', visibleEvidence: null, unknownReason: 'Not shown' },
      about: { value: null, confidence: 'low', visibleEvidence: null, unknownReason: 'Not shown' },
      careRoutine: { value: null, confidence: 'low', visibleEvidence: null, unknownReason: 'Not shown' },
      homeEnvironment: { value: null, confidence: 'low', visibleEvidence: null, unknownReason: 'Not shown' },
      petPreferences: { value: null, confidence: 'low', visibleEvidence: null, unknownReason: 'Not shown' },
      experienceSummary: { value: null, confidence: 'low', visibleEvidence: null, unknownReason: 'Not shown' },
      specialCareSummary: { value: null, confidence: 'low', visibleEvidence: null, unknownReason: 'Not shown' },
      services: [{
        name: { value: 'Boarding', confidence: 'high', visibleEvidence: 'Boarding', unknownReason: null },
        description: { value: 'Care in my home', confidence: 'medium', visibleEvidence: 'Care in my home', unknownReason: null },
        startingPrice: { value: '$55', confidence: 'medium', visibleEvidence: '$55', unknownReason: null },
        billingUnit: { value: 'per night', confidence: 'high', visibleEvidence: 'per night', unknownReason: null }
      }], portrait: null
    } });
    const vision = createOpenRouterVision({ apiKey: 'secret', model: 'google/gemini-3.7-flash', generate });
    const result = await vision.extract([{ index: 0, top: 0, width: 10, height: 10, bytes: new Uint8Array([1]), mediaType: 'image/jpeg' }], new AbortController().signal);
    expect(result.reviewed).toEqual({ sitterName: 'Jamie', services: ['Boarding'], serviceDetails: { Boarding: { description: 'Care in my home', startingPrice: '$55', billingUnit: 'per night' } } });
    expect(result.serviceConfidence).toEqual({ Boarding: { name: 'high', description: 'medium', startingPrice: 'medium', billingUnit: 'high' } });
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ maxRetries: 0, timeout: { totalMs: 25_000 }, providerOptions: { openrouter: { provider: { require_parameters: true, allow_fallbacks: false, data_collection: 'deny', zdr: true } } } }));
    expect(VISION_SYSTEM_PROMPT).toMatch(/untrusted data/i);
    expect(VISION_SYSTEM_PROMPT).toMatch(/ignore.*instruction/i);
  });

  it('suppresses low-confidence or unevidenced output', async () => {
    const output = Object.fromEntries(['sitterName','businessName','tagline','location','about','careRoutine','homeEnvironment','petPreferences','experienceSummary','specialCareSummary'].map((name) => [name, { value: name === 'about' ? 'Invented' : null, confidence: 'low', visibleEvidence: null, unknownReason: 'Unknown' }]));
    const generate = vi.fn().mockResolvedValue({ output: { ...output, services: [], portrait: null } });
    const vision = createOpenRouterVision({ apiKey: 'secret', model: 'model', generate });
    await expect(vision.extract([{ index: 0, top: 0, width: 10, height: 10, bytes: new Uint8Array([1]), mediaType: 'image/jpeg' }], new AbortController().signal)).rejects.toMatchObject({ code: 'NO_VISIBLE_PROFILE_CONTENT' });
  });
});
