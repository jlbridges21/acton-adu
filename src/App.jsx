import { AuthProvider } from "./context/AuthContext";
import { PriceRegionProvider } from "./context/PriceRegionContext";
import AuthGate from "./components/AuthGate";
import LibraryPage from "./pages/LibraryPage";

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <PriceRegionProvider>
          <LibraryPage />
        </PriceRegionProvider>
      </AuthGate>
    </AuthProvider>
  );
}
