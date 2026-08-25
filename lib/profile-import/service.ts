import { profiles } from '../profiles';
import { createRedisImportAdmission } from './admission';
import type { RoverImportConfig } from './config';
import { createOpenRouterVision } from './openrouter-vision';
import { createPostgresReviewedProfileWriter } from './profile-writer';
import { createRoverProfileImports } from './rover';
import { createScreenshotOneCapture } from './screenshotone';

export function createConfiguredRoverProfileImports(config: RoverImportConfig) {
  return createRoverProfileImports({
    profiles,
    admission: createRedisImportAdmission(),
    capture: createScreenshotOneCapture({ accessKey: config.screenshotOneAccessKey }),
    vision: createOpenRouterVision({ apiKey: config.openRouterApiKey, model: config.visionModel }),
    writer: createPostgresReviewedProfileWriter(),
    log: (event) => console.info(JSON.stringify(event))
  });
}
