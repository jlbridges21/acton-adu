import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PriceRegionProvider } from "./context/PriceRegionContext";
import { SeriesProvider } from "./context/SeriesContext";
import AuthGate from "./components/AuthGate";
import AdminFloorplansPage from "./pages/AdminFloorplansPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import LibraryPage from "./pages/LibraryPage";

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <PriceRegionProvider>
          <SeriesProvider>
            <Routes>
              <Route path="/admin/plans" element={<AdminFloorplansPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="*" element={<LibraryPage />} />
            </Routes>
          </SeriesProvider>
        </PriceRegionProvider>
      </AuthGate>
    </AuthProvider>
  );
}
