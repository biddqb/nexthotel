import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { bootstrapStatus } from "./lib/api";
import { AuthProvider, useAuth } from "./lib/auth";
import { AppShell } from "./components/AppShell";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { UpdateBanner } from "./components/UpdateBanner";
import { RequireRole } from "./components/RequireRole";
import { BootstrapWizard } from "./pages/BootstrapWizard";
import { LoginPage } from "./pages/LoginPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { GuestsPage } from "./pages/GuestsPage";
import { HousekeepingPage } from "./pages/HousekeepingPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <AuthProvider>
      <ConnectionStatus />
      <UpdateBanner />
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { user, loading, refresh } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: status, isLoading: statusLoading, refetch } = useQuery({
    queryKey: ["bootstrap-status", refreshKey],
    queryFn: bootstrapStatus,
  });

  useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);

  if (loading || statusLoading || !status) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
        Đang tải...
      </div>
    );
  }

  if (status.needs_bootstrap) {
    return (
      <BootstrapWizard
        onComplete={() => {
          setRefreshKey((k) => k + 1);
          refresh();
        }}
      />
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/calendar" replace />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/housekeeping" element={<HousekeepingPage />} />
        <Route path="/guests" element={<GuestsPage />} />
        <Route
          path="/expenses"
          element={
            <RequireRole minRole="manager">
              <ExpensesPage />
            </RequireRole>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireRole minRole="manager">
              <ReportsPage />
            </RequireRole>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireRole minRole="manager">
              <SettingsPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/calendar" replace />} />
      </Route>
    </Routes>
  );
}
