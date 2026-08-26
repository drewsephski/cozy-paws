import { query } from './db';
import { commercialStateAt, type CommercialState } from './domain/commercial-lifecycle';
import type { PoolClient } from 'pg';

type CommercialTrialRecord = {
  businessId: string;
  businessName: string;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
};

export type BusinessCommercialState = {
  businessId: string;
  businessName: string;
  currentState: CommercialState;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  paymentMethodEligible: boolean;
};

export type CommercialLifecycleRepository = {
  readOwnerCommercialTrials(ownerUserId: string): Promise<CommercialTrialRecord[]>;
};

type CommercialTrialRow = {
  business_id: string;
  business_name: string;
  trial_started_at: Date | null;
  trial_ends_at: Date | null;
};

const postgresCommercialLifecycleRepository: CommercialLifecycleRepository = {
  async readOwnerCommercialTrials(ownerUserId) {
    const result = await query<CommercialTrialRow>(
      `select b.id business_id,b.name business_name,state.trial_started_at,state.trial_ends_at
       from business b
       left join business_commercial_state state on state.business_id=b.id
       where b.owner_user_id=$1
       order by b.created_at,b.id`,
      [ownerUserId]
    );
    return result.rows.map((row) => ({
      businessId: row.business_id,
      businessName: row.business_name,
      trialStartedAt: row.trial_started_at,
      trialEndsAt: row.trial_ends_at
    }));
  }
};

export function createCommercialLifecycle(repository: CommercialLifecycleRepository, now = () => new Date()) {
  return {
    async listOwnerCommercialStates(ownerUserId: string): Promise<BusinessCommercialState[]> {
      const currentTime = now();
      return (await repository.readOwnerCommercialTrials(ownerUserId)).map((record) => {
        const trial = record.trialStartedAt && record.trialEndsAt
          ? { trialStartedAt: record.trialStartedAt, trialEndsAt: record.trialEndsAt }
          : null;
        return {
          businessId: record.businessId,
          businessName: record.businessName,
          currentState: commercialStateAt(trial, currentTime),
          trialStartedAt: record.trialStartedAt,
          trialEndsAt: record.trialEndsAt,
          paymentMethodEligible: trial !== null
        };
      });
    }
  };
}

export const commercialLifecycle = createCommercialLifecycle(postgresCommercialLifecycleRepository);

export async function startBusinessTrialFromOwnedPublishedSite(
  client: PoolClient,
  ownerUserId: string,
  subdomain: string
) {
  await client.query(
    `insert into business_commercial_state(business_id,trial_started_at,trial_ends_at)
     select published.business_id,published.first_published_at,published.first_published_at+interval '30 days'
     from (
       select target.business_id,min(s.onboarding_completed_at) first_published_at
       from site target
       join business b on b.id=target.business_id
       join site s on s.business_id=target.business_id
       where target.subdomain=$1 and b.owner_user_id=$2 and s.onboarding_completed_at is not null
       group by target.business_id
     ) published
     on conflict(business_id) do nothing`,
    [subdomain, ownerUserId]
  );
}
