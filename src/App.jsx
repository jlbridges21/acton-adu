import { AuthProvider } from "./context/AuthContext";
import AuthGate from "./components/AuthGate";
import LibraryPage from "./pages/LibraryPage";

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <LibraryPage />
      </AuthGate>
    </AuthProvider>
  );
}
