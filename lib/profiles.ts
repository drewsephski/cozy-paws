import { createProfileOwnership } from './profile-ownership';
import { redisProfileRepository } from './redis-profile-repository';

export const profiles = createProfileOwnership(redisProfileRepository);

export type { BusinessProfile, Lead, ProfileRecord } from './profile-ownership';
