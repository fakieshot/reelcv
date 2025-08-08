import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CheckEmail from "./pages/CheckEmail";
import NotFound from "./pages/NotFound";

// DASHBOARD
import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardIndex from "@/pages/dashboard/Index";
import EmployerDashboard from "./pages/dashboard/EmployerDashboard";
import SeekerDashboard from "./pages/dashboard/SeekerDashboard";

// GUARDS
import RequireAuth from "@/components/auth/RequireAuth";
import RoleGate from "@/components/auth/RoleGate";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/check-email" element={<CheckEmail />} />

      {/* NESTED DASHBOARD ROUTES */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth verified>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardIndex />} />
      {/* Candidate */}
        <Route
          path="employer"
          element={
            <RoleGate allow="employer">
              <EmployerDashboard />
            </RoleGate>
          }
        />

        <Route
          path="jobseeker"
          element={
            <RoleGate allow="jobseeker">
              <SeekerDashboard />
            </RoleGate>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
