/**
 * Similar plans: square footage within ±100 SF of the current plan.
 * Excludes the current plan.
 */
export function getSimilarFloorplans(plan, allPlans) {
  if (!plan || plan.squareFeet == null) return [];

  return allPlans.filter((other) => {
    if (other.id === plan.id) return false;
    if (other.squareFeet == null) return false;

    return Math.abs(other.squareFeet - plan.squareFeet) <= 100;
  });
}
