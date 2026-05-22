/**
 * Similar plans: same bedroom count OR square footage within ±100 SF.
 * Excludes the current plan.
 */
export function getSimilarFloorplans(plan, allPlans) {
  if (!plan) return [];

  return allPlans.filter((other) => {
    if (other.id === plan.id) return false;

    const sameBeds = other.beds === plan.beds;
    const similarSqft =
      plan.squareFeet != null &&
      other.squareFeet != null &&
      Math.abs(other.squareFeet - plan.squareFeet) <= 100;

    return sameBeds || similarSqft;
  });
}
