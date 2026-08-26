export type CommercialState = 'NOT_STARTED' | 'TRIAL' | 'TRIAL_ENDED';

export type TrialPeriod = {
  trialStartedAt: Date;
  trialEndsAt: Date;
};

export function commercialStateAt(trial: TrialPeriod | null, now: Date): CommercialState {
  if (!trial) return 'NOT_STARTED';
  return now < trial.trialEndsAt ? 'TRIAL' : 'TRIAL_ENDED';
}
