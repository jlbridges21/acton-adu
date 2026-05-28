import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import FilterBar from "../components/FilterBar";
import SortBar from "../components/SortBar";
import FloorplanGrid from "../components/FloorplanGrid";
import FloorplanSeriesSections from "../components/FloorplanSeriesSections";
import FloorplanViewModal from "../components/FloorplanViewModal";
import FloorplanEditModal from "../components/FloorplanEditModal";
import EmptyState from "../components/EmptyState";
import AddPlanModal from "../components/AddPlanModal";
import PermissionModal from "../components/PermissionModal";
import CatalogExportBar from "../components/CatalogExportBar";
import { useAuth } from "../context/AuthContext";
import { fetchFloorplans } from "../lib/floorplans";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  SORT_OPTIONS,
  filterFloorplans,
  getUniqueSeries,
  groupFloorplansBySeries,
  sortFloorplans,
} from "../utils/filters";

export default function LibraryPage() {
  const { user, isAdmin, signOut } = useAuth();

  const [floorplans, setFloorplans] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const loadFloorplans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchFloorplans();
      setFloorplans(data);
    } catch (err) {
      setError(
        err.message ||
          "Could not load floorplans. Check your Supabase connection and role access.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFloorplans();
  }, [loadFloorplans]);

  const seriesOptions = useMemo(() => getUniqueSeries(floorplans), [floorplans]);

  const filteredFloorplans = useMemo(
    () => sortFloorplans(filterFloorplans(floorplans, filters), sortBy),
    [floorplans, filters, sortBy],
  );

  const seriesGroups = useMemo(
    () =>
      sortBy === "series" ? groupFloorplansBySeries(filteredFloorplans) : [],
    [filteredFloorplans, sortBy],
  );

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const handleOpenPlan = (plan) => setSelectedPlan(plan);

  const togglePlanSelection = (planId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedPlans = useMemo(
    () => floorplans.filter((plan) => selectedIds.has(plan.id)),
    [floorplans, selectedIds],
  );

  const selectedPlanFresh = useMemo(
    () => floorplans.find((p) => p.id === selectedPlan?.id) ?? selectedPlan,
    [floorplans, selectedPlan],
  );

  const handleAddPlanClick = () => {
    if (isAdmin) {
      setAddOpen(true);
    } else {
      setPermissionOpen(true);
    }
  };

  const showLibraryEmpty = !loading && !error && floorplans.length === 0;
  const showFilteredEmpty =
    !loading && !error && floorplans.length > 0 && filteredFloorplans.length === 0;

  return (
    <div
      className={`min-h-screen bg-slate-50 ${selectedIds.size > 0 ? "pb-36" : ""}`}
    >
      <Header
        onAddPlan={handleAddPlanClick}
        showAddPlan
        userEmail={user?.email}
        onSignOut={signOut}
      />

      <FilterBar
        filters={filters}
        seriesOptions={seriesOptions}
        onFilterChange={setFilters}
        onClearFilters={clearFilters}
      />

      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {error && (
            <div
              className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm font-medium text-slate-600">Loading floorplans…</p>
          ) : (
            <>
              <SortBar
                showingCount={filteredFloorplans.length}
                totalCount={floorplans.length}
                sortBy={sortBy}
                sortOptions={SORT_OPTIONS}
                onSortChange={setSortBy}
              />

              {showLibraryEmpty ? (
                <EmptyState variant="library" />
              ) : showFilteredEmpty ? (
                <EmptyState variant="filtered" onClearFilters={clearFilters} />
              ) : sortBy === "series" ? (
                <FloorplanSeriesSections
                  groups={seriesGroups}
                  onOpenPlan={handleOpenPlan}
                  selectedIds={selectedIds}
                  onToggleSelect={togglePlanSelection}
                />
              ) : (
                <FloorplanGrid
                  plans={filteredFloorplans}
                  onOpenPlan={handleOpenPlan}
                  selectedIds={selectedIds}
                  onToggleSelect={togglePlanSelection}
                />
              )}
            </>
          )}
        </div>
      </main>

      <PermissionModal open={permissionOpen} onClose={() => setPermissionOpen(false)} />

      <AddPlanModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onUploaded={loadFloorplans}
      />

      <CatalogExportBar
        selectedCount={selectedIds.size}
        selectedPlans={selectedPlans}
        onClearSelection={clearSelection}
      />

      {isAdmin ? (
        <FloorplanEditModal
          plan={selectedPlanFresh}
          onClose={() => setSelectedPlan(null)}
          onSaved={loadFloorplans}
        />
      ) : (
        <FloorplanViewModal
          plan={selectedPlanFresh}
          allPlans={floorplans}
          onClose={() => setSelectedPlan(null)}
          onOpenPlan={handleOpenPlan}
        />
      )}
    </div>
  );
}
