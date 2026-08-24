import { RoverImportError } from './types';

export type RoverImportConfig = {
  screenshotOneAccessKey: string;
  openRouterApiKey: string;
  visionModel: string;
};

export function isRoverImportPocEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.ROVER_IMPORT_POC_ENABLED === 'true';
}

export function isRoverImportPrepareAvailable(env: NodeJS.ProcessEnv = process.env) {
  return isRoverImportPocEnabled(env) && Boolean(env.SCREENSHOTONE_ACCESS_KEY && env.OPENROUTER_API_KEY);
}

export function resolveRoverImportConfig(operation: 'prepare' | 'apply' = 'prepare', env: NodeJS.ProcessEnv = process.env): RoverImportConfig {
  if (!isRoverImportPocEnabled(env)) throw new RoverImportError('POC_DISABLED');
  const screenshotOneAccessKey = env.SCREENSHOTONE_ACCESS_KEY ?? '';
  const openRouterApiKey = env.OPENROUTER_API_KEY ?? '';
  if (operation === 'prepare' && (!screenshotOneAccessKey || !openRouterApiKey)) throw new RoverImportError('PROVIDER_NOT_CONFIGURED');
  return { screenshotOneAccessKey, openRouterApiKey, visionModel: env.OPENROUTER_VISION_MODEL || 'openai/gpt-5.4-mini' };
}
