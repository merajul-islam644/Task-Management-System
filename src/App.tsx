import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { I18nProvider } from "@/lib/i18n";
import { RequireAuth, RedirectIfAuthenticated } from "@/app/router/guards";
import { CallbackPage } from "@/features/auth/CallbackPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { AppShell } from "@/components/layout/AppShell";
import { OverviewPage } from "@/pages/OverviewPage";
import { TasksPage } from "@/pages/TasksPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { EmptyState } from "@/components/ui/Feedback";
import { Compass } from "lucide-react";

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
      <Routes>
        {/* Auth routes stay outside the guarded shell, and the callback route
            is reachable while unauthenticated — that's the whole point of it. */}
        <Route
          path="/login"
          element={
            <RedirectIfAuthenticated>
              <LoginPage />
            </RedirectIfAuthenticated>
          }
        />
        <Route path="/login/callback" element={<CallbackPage />} />

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<OverviewPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="*"
            element={
              <div className="rounded-card border border-line bg-surface">
                <EmptyState
                  icon={Compass}
                  title="Page not found"
                  description="The page you're looking for doesn't exist in this workspace."
                />
              </div>
            }
          />
        </Route>
      </Routes>
      </AuthProvider>
    </I18nProvider>
  );
}
