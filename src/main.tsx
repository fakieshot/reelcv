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
// src/main.tsx (or wherever you define routes)
import UploadCenter from "./pages/dashboard/Upload";

// GUARDS
import RequireAuth from "@/components/auth/RequireAuth";
import RoleGate from "@/components/auth/RoleGate";
import ReelCV from "./pages/dashboard/ReelCV";

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

 <Route path="upload" element={<RoleGate allow="jobseeker"><UploadCenter /></RoleGate>} />
<Route path="reelcv" element={<RoleGate allow="jobseeker"><ReelCV /></RoleGate>} />


      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
