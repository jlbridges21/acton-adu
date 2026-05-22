import { AuthProvider } from "./context/AuthContext";
import LibraryPage from "./pages/LibraryPage";

export default function App() {
  return (
    <AuthProvider>
      <LibraryPage />
    </AuthProvider>
  );
}
