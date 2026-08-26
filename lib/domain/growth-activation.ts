export type BusinessActivationEvidence = {
  businessId: string;
  setupActivatedAt: Date | null;
  firstQualifiedAt: Date | null;
};

export type BusinessActivation = {
  businessId: string;
  setupActivatedAt: Date | null;
  valueActivatedAt: Date | null;
};

function endOfValueActivationWindow(setup: Date) {
  return Date.UTC(setup.getUTCFullYear(), setup.getUTCMonth(), setup.getUTCDate() + 15) - 1;
}

export function deriveBusinessActivation(evidence: BusinessActivationEvidence): BusinessActivation {
  const setup = evidence.setupActivatedAt;
  const qualified = evidence.firstQualifiedAt;
  const qualifiedInsideWindow = setup && qualified
    && qualified.getTime() >= setup.getTime()
    && qualified.getTime() <= endOfValueActivationWindow(setup);

  return {
    businessId: evidence.businessId,
    setupActivatedAt: setup,
    valueActivatedAt: qualifiedInsideWindow ? qualified : null
  };
}
