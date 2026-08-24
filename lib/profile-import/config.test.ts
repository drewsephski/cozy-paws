import { describe, expect, it } from 'vitest';
import { isRoverImportPocEnabled, resolveRoverImportConfig } from './config';

describe('Rover import POC configuration', () => {
  it('uses the explicit feature flag in local and Vercel runtimes', () => {
    expect(isRoverImportPocEnabled({ ROVER_IMPORT_POC_ENABLED: 'true', NODE_ENV: 'production', VERCEL: '1' })).toBe(true);
    expect(isRoverImportPocEnabled({ ROVER_IMPORT_POC_ENABLED: 'false', NODE_ENV: 'development' })).toBe(false);
    expect(isRoverImportPocEnabled({ NODE_ENV: 'development' })).toBe(false);
    expect(resolveRoverImportConfig('prepare', {
      ROVER_IMPORT_POC_ENABLED: 'true',
      NODE_ENV: 'production',
      VERCEL: '1',
      SCREENSHOTONE_ACCESS_KEY: 'x',
      OPENROUTER_API_KEY: 'y',
    })).toMatchObject({ visionModel: 'openai/gpt-5.4-mini' });
  });

  it('requires provider credentials only for capture and analysis', () => {
    const env = { ROVER_IMPORT_POC_ENABLED: 'true', NODE_ENV: 'development' as const };
    expect(() => resolveRoverImportConfig('prepare', env)).toThrow();
    expect(resolveRoverImportConfig('apply', env)).toMatchObject({ visionModel: 'openai/gpt-5.4-mini' });
  });
});
