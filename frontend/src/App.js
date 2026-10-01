import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Header from "./components/LandingPage/Header";
import Footer from "./components/LandingPage/Footer";
import Features from "./components/LandingPage/Features";
import Testimonials from "./components/LandingPage/Testimonials";
import Login from "./components/Login";
import Register from "./components/Register";
import HowItWorks from "./components/LandingPage/HowItWorks";
import ClientDashboard from "./components/ClientDashboard";
import GroupDetail from "./components/GroupDetail";
import GroupsManager from "./components/GroupsManager";
import { ThemeProvider } from "./context/ThemeContext";
import { I18nProvider } from "./context/I18nContext";

function Landing() {
  return (
    <>
      <Header />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Footer />
    </>
  );
}

function Protected({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <Router>
          <Routes>
            {/* Página principal (landing) */}
            <Route path="/" element={<Landing />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Panel principal */}
            <Route
              path="/client-dashboard"
              element={
                <Protected>
                  <ClientDashboard />
                </Protected>
              }
            />

            {/* Sección Grupos */}
            <Route
              path="/client-dashboard/groups"
              element={
                <Protected>
                  <ClientDashboard>
                    <GroupsManager
                      key={localStorage.getItem("token") || "no-token"}
                    />
                  </ClientDashboard>
                </Protected>
              }
            />

            <Route
              path="/client-dashboard/groups/:groupId"
              element={
                <Protected>
                  <GroupDetail />
                </Protected>
              }
            />

            {/* Rutas adicionales del panel */}
            <Route
              path="/client-dashboard/summary"
              element={
                <Protected>
                  <ClientDashboard />
                </Protected>
              }
            />
            <Route
              path="/client-dashboard/settings"
              element={
                <Protected>
                  <ClientDashboard />
                </Protected>
              }
            />

            {/* Compatibilidad y 404 */}
            <Route
              path="/groups"
              element={<Navigate to="/client-dashboard/groups" replace />}
            />
            <Route
              path="/groups/:groupId"
              element={
                <Navigate to="/client-dashboard/groups/:groupId" replace />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </I18nProvider>
    </ThemeProvider>
  );
}
