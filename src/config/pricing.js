export const PRICE_REGION = {
  SAN_JOSE: "san-jose",
  LA: "la",
};

/** LA price = San Jose base × multiplier + sq ft × rate − offset */
export const LA_PRICE_MULTIPLIER = 0.431603014;
export const LA_SQFT_RATE = 211.959324;
export const LA_PRICE_OFFSET = 2191.28726;

export function getDisplayBasePrice(
  basePrice,
  priceRegion = PRICE_REGION.SAN_JOSE,
  squareFeet = 0,
) {
  const value = basePrice ?? 0;

  if (priceRegion === PRICE_REGION.LA) {
    const sqft = Number(squareFeet) || 0;
    const laPrice =
      value * LA_PRICE_MULTIPLIER + sqft * LA_SQFT_RATE - LA_PRICE_OFFSET;
    return Math.ceil(laPrice / 1000) * 1000;
  }

  return value;
}

export function formatPlanPrice(plan, priceRegion = PRICE_REGION.SAN_JOSE) {
  const amount = getDisplayBasePrice(plan.basePrice, priceRegion, plan.squareFeet);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
