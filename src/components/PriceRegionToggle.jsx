import { PRICE_REGION } from "../config/pricing";
import { usePriceRegion } from "../context/PriceRegionContext";

const optionClass = (active) =>
  `rounded-full px-4 py-2 text-sm font-semibold transition ${
    active
      ? "bg-blue-600 text-white shadow-sm"
      : "text-slate-600 hover:text-slate-900"
  }`;

export default function PriceRegionToggle() {
  const { priceRegion, setPriceRegion } = usePriceRegion();

  return (
    <div
      className="flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 p-1"
      role="group"
      aria-label="Price region"
    >
      <button
        type="button"
        className={optionClass(priceRegion === PRICE_REGION.SAN_JOSE)}
        aria-pressed={priceRegion === PRICE_REGION.SAN_JOSE}
        onClick={() => setPriceRegion(PRICE_REGION.SAN_JOSE)}
      >
        San Jose
      </button>
      <button
        type="button"
        className={optionClass(priceRegion === PRICE_REGION.LA)}
        aria-pressed={priceRegion === PRICE_REGION.LA}
        onClick={() => setPriceRegion(PRICE_REGION.LA)}
      >
        LA
      </button>
    </div>
  );
}
