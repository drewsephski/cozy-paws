import { createProfileOwnership } from './profile-ownership';
import { postgresProfileRepository } from './postgres-profile-repository';

export const profiles = createProfileOwnership(postgresProfileRepository);

export type { BusinessProfile, Lead, ProfileRecord } from './profile-ownership';
