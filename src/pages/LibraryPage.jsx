import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import FilterBar from "../components/FilterBar";
import FloorplanCard from "../components/FloorplanCard";
import FloorplanViewModal from "../components/FloorplanViewModal";
import FloorplanEditModal from "../components/FloorplanEditModal";
import EmptyState from "../components/EmptyState";
import LoginModal from "../components/LoginModal";
import AddPlanModal from "../components/AddPlanModal";
import PermissionModal from "../components/PermissionModal";
import { useAuth } from "../context/AuthContext";
import { fetchFloorplans } from "../lib/floorplans";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  SORT_OPTIONS,
  filterFloorplans,
  getUniqueSeries,
  sortFloorplans,
} from "../utils/filters";

export default function LibraryPage() {
  const {
    user,
    isAdmin,
    loading: authLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  } = useAuth();

  const [floorplans, setFloorplans] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [loginOpen, setLoginOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [pendingAdd, setPendingAdd] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const loadFloorplans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchFloorplans();
      setFloorplans(data);
    } catch (err) {
      setError(
        err.message ||
          "Could not load floorplans. Check your Supabase connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFloorplans();
  }, [loadFloorplans]);

  // After login, open upload if user is admin (otherwise show permission message).
  useEffect(() => {
    if (!pendingAdd || authLoading || !user) return;

    setPendingAdd(false);
    setLoginOpen(false);

    if (isAdmin) {
      setAddOpen(true);
    } else {
      setPermissionOpen(true);
    }
  }, [pendingAdd, authLoading, user, isAdmin]);

  const seriesOptions = useMemo(() => getUniqueSeries(floorplans), [floorplans]);

  const filteredFloorplans = useMemo(
    () => sortFloorplans(filterFloorplans(floorplans, filters), sortBy),
    [floorplans, filters, sortBy],
  );

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSortBy(DEFAULT_SORT);
  };

  const handleOpenPlan = (plan) => setSelectedPlan(plan);

  const selectedPlanFresh = useMemo(
    () => floorplans.find((p) => p.id === selectedPlan?.id) ?? selectedPlan,
    [floorplans, selectedPlan],
  );

  const handleAddPlanClick = () => {
    if (authLoading) return;

    if (!user) {
      setPendingAdd(true);
      setLoginOpen(true);
      return;
    }

    if (!isAdmin) {
      setPermissionOpen(true);
      return;
    }

    setAddOpen(true);
  };

  const handleLogin = async ({ mode, email, password }) => {
    if (mode === "signUp") {
      await signUp(email, password);
      return;
    }

    await signIn(email, password);
    await refreshProfile();

    if (!pendingAdd) {
      setLoginOpen(false);
    }
  };

  const showLibraryEmpty = !loading && !error && floorplans.length === 0;
  const showFilteredEmpty =
    !loading && !error && floorplans.length > 0 && filteredFloorplans.length === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        onAddPlan={handleAddPlanClick}
        userEmail={user?.email}
        onSignOut={user ? signOut : undefined}
      />

      <FilterBar
        filters={filters}
        seriesOptions={seriesOptions}
        sortBy={sortBy}
        sortOptions={SORT_OPTIONS}
        onFilterChange={setFilters}
        onSortChange={setSortBy}
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
              <p className="mb-6 text-sm font-medium text-slate-600">
                Showing {filteredFloorplans.length} of {floorplans.length} floorplans
              </p>

              {showLibraryEmpty ? (
                <EmptyState variant="library" />
              ) : showFilteredEmpty ? (
                <EmptyState variant="filtered" onClearFilters={clearFilters} />
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredFloorplans.map((plan) => (
                    <FloorplanCard
                      key={plan.id}
                      plan={plan}
                      onOpenPlan={handleOpenPlan}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <LoginModal
        open={loginOpen}
        onClose={() => {
          setLoginOpen(false);
          setPendingAdd(false);
        }}
        onSuccess={handleLogin}
      />

      <PermissionModal
        open={permissionOpen}
        onClose={() => setPermissionOpen(false)}
      />

      <AddPlanModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onUploaded={loadFloorplans}
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
