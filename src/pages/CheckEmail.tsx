// src/pages/CheckEmail.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { sendEmailVerification } from "firebase/auth";

export default function CheckEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = (location.state as any)?.email || "";

  const [email, setEmail] = useState(emailFromState);
  const [status, setStatus] = useState<"idle" | "resending" | "sent" | "verified" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    setEmail(emailFromState || "");
  }, [emailFromState]);

  async function handleResend() {
    setError("");
    setStatus("resending");
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Your session expired. Please login and try again.");
        setStatus("error");
        return;
      }
      await sendEmailVerification(user, {
        url: `${window.location.origin}/login?verifyEmail=true`,
      });
      setStatus("sent");
    } catch (e: any) {
      setError(e.message || "Could not resend verification email.");
      setStatus("error");
    }
  }

  async function handleIveVerified() {
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }
      await user.reload();
      if (user.emailVerified) {
        setStatus("verified");
        navigate("/login?verified=1");
      } else {
        setError("Still not verified. Please click the link in your email.");
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-50 p-6">
      <div className="w-full max-w-lg bg-white/90 backdrop-blur rounded-2xl shadow-xl p-8">
        <div className="mx-auto size-16 mb-4 rounded-full bg-indigo-50 flex items-center justify-center">
          <span className="text-3xl">📩</span>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900">Verify your email</h1>
        <p className="mt-3 text-center text-gray-600">
          We’ve sent a verification link to{" "}
          <span className="font-medium text-gray-900">{email || "your inbox"}</span>.
          Please check your inbox (and spam) and click the link to activate your account.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => window.open("https://mail.google.com", "_blank")}
            className="w-full rounded-lg py-2.5 bg-black/90 text-white hover:bg-black"
          >
            Open Gmail
          </button>

          <button
            onClick={handleResend}
            className="w-full rounded-lg py-2.5 border border-indigo-200 hover:bg-indigo-50 text-indigo-700"
          >
            {status === "resending" ? "Resending..." : "Resend verification email"}
          </button>

          <button
            onClick={handleIveVerified}
            className="w-full rounded-lg py-2.5 bg-indigo-600 text-white hover:bg-indigo-700"
          >
            I’ve verified — Continue
          </button>

          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-lg py-2.5 text-gray-500 hover:text-gray-700"
          >
            Go to Login
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
        {status === "sent" && <p className="mt-4 text-sm text-green-600 text-center">Verification email sent again.</p>}
      </div>
    </div>
  );
}
