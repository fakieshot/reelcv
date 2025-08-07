import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import "./index.css";   // ← Φορτώνει το Tailwind CSS
import Login from "./pages/Login";
import Register from "./pages/Register";
import EmployerDashboard from "./pages/dashboard/EmployerDashboard";
import SeekerDashboard   from "./pages/dashboard/SeekerDashboard";
import NotFound           from "./pages/NotFound";


createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      {/* Εδώ λες εσύ ποια είναι η «αρχική» */}
      <Route path="/" element={<Landing />} />

      {/* Αν θες, μπορείς να έχεις και εναλλακτικό Index: */}
      {/* <Route path="/" element={<Index />} /> */}

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Dashboard routes */}
      <Route path="/dashboard/employer" element={<EmployerDashboard />} />
      <Route path="/dashboard/jobseeker" element={<SeekerDashboard />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
