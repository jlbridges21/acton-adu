import { createContext, useContext, useMemo, useState } from "react";
import { PRICE_REGION } from "../config/pricing";

const PriceRegionContext = createContext(null);

export function PriceRegionProvider({ children }) {
  const [priceRegion, setPriceRegion] = useState(PRICE_REGION.SAN_JOSE);

  const value = useMemo(
    () => ({ priceRegion, setPriceRegion }),
    [priceRegion],
  );

  return (
    <PriceRegionContext.Provider value={value}>{children}</PriceRegionContext.Provider>
  );
}

export function usePriceRegion() {
  const ctx = useContext(PriceRegionContext);
  if (!ctx) {
    throw new Error("usePriceRegion must be used within PriceRegionProvider");
  }
  return ctx;
}
