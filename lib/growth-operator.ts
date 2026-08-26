export function isGrowthOperator(userId: string, configuredUserId = process.env.SITTERFOLIO_GROWTH_OPERATOR_USER_ID) {
  return Boolean(configuredUserId && userId === configuredUserId);
}
