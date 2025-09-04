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
import UploadCenter from "./pages/dashboard/Upload";
import ReelCV from "./pages/dashboard/ReelCV";
import SupportDesk from "@/pages/dashboard/admin/SupportDesk";
import Messages from "./pages/dashboard/messages"; // ⬅️ NEW

// GUARDS
import RequireAuth from "@/components/auth/RequireAuth";
import RoleGate from "@/components/auth/RoleGate";
import "@/styles/scrollbar.css";
import { setLogLevel } from "firebase/firestore";
// TOASTER
import { Toaster } from "@/components/ui/toaster";

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
        <Route path="/dashboard/admin/support" element={<SupportDesk />} />

        <Route index element={<DashboardIndex />} />

        {/* Employer */}
        <Route
          path="employer"
          element={
            <RoleGate allow="employer">
              <EmployerDashboard />
            </RoleGate>
          }
        />

        {/* Jobseeker */}
        <Route
          path="jobseeker"
          element={
            <RoleGate allow="jobseeker">
              <SeekerDashboard />
            </RoleGate>
          }
        />

        <Route
          path="upload"
          element={
            <RoleGate allow="jobseeker">
              <UploadCenter />
            </RoleGate>
          }
        />
        <Route
          path="reelcv"
          element={
            <RoleGate allow="jobseeker">
              <ReelCV />
            </RoleGate>
          }
        />
        setLogLevel("debug");

        {/* ✅ Messages (DMs) */}
        <Route path="messages" element={<Messages />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>

    {/* ✅ Global Toaster - appears bottom-right */}
    <Toaster />
  </BrowserRouter>
);
