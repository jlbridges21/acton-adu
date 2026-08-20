import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PriceRegionProvider } from "./context/PriceRegionContext";
import AuthGate from "./components/AuthGate";
import AdminFloorplansPage from "./pages/AdminFloorplansPage";
import LibraryPage from "./pages/LibraryPage";

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <PriceRegionProvider>
          <Routes>
            <Route path="/admin/plans" element={<AdminFloorplansPage />} />
            <Route path="*" element={<LibraryPage />} />
          </Routes>
        </PriceRegionProvider>
      </AuthGate>
    </AuthProvider>
  );
}
