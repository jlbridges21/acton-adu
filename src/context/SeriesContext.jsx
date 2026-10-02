import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SERIES_OPTIONS } from "../config/series";
import { fetchPlanSeries } from "../lib/planSeries";

const SeriesContext = createContext(null);

export function SeriesProvider({ children }) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const data = await fetchPlanSeries();
      setSeries(data);
    } catch (err) {
      setSeries([]);
      setError(err.message || "Could not load series.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const usingFallback = Boolean(error);
  const seriesNames = usingFallback ? SERIES_OPTIONS : series.map((item) => item.name);

  const value = useMemo(
    () => ({
      series,
      seriesNames,
      loading,
      error,
      usingFallback,
      refresh,
    }),
    [series, seriesNames, loading, error, usingFallback, refresh],
  );

  return <SeriesContext.Provider value={value}>{children}</SeriesContext.Provider>;
}

export function useSeries() {
  const ctx = useContext(SeriesContext);
  if (!ctx) {
    throw new Error("useSeries must be used within SeriesProvider");
  }
  return ctx;
}
