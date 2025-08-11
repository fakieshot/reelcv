import { useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { auth, firestore } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { AlertCircle, CheckCircle2, MailCheck } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const verifyEmailFlag = searchParams.get("verifyEmail");
  const params = new URLSearchParams(location.search);
  const verifyMsg = params.get("verifyEmail");
  const justVerified = params.get("verified");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(verifyEmailFlag ? "" : "");

  const handleLogin = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // Require email verification
      if (!user.emailVerified) {
        setError("Please verify your email before logging in.");
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Fetch role (kept in case you use it later)
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      if (!userDoc.exists()) throw new Error("User data not found");
      // const { role } = userDoc.data();

      // Role-based redirect could be done here later if needed
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      // Friendlier generic message (you can refine per-code if you want)
      const raw = err?.message || "Login failed";
      const friendly =
        raw.includes("auth/invalid-credential") ||
        raw.toLowerCase().includes("wrong") ||
        raw.toLowerCase().includes("invalid")
          ? "The email or password you entered is incorrect."
          : raw;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || loading) return;
    await handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 space-y-5">
        <h1 className="text-3xl font-bold text-center text-gray-800">Login to ReelCV</h1>

        {/* Info banners (verification flow) */}
        {(verifyMsg || justVerified) && (
          <div
            className={`flex items-start gap-2 rounded-lg p-3 text-sm border ${
              justVerified
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
            }`}
          >
            {justVerified ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5" />
            ) : (
              <MailCheck className="h-4 w-4 mt-0.5" />
            )}
            <span>
              {justVerified
                ? "Email verified! You can sign in now."
                : "We’ve sent you a verification link. Please check your inbox (and spam)."}
            </span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            className="flex items-start gap-2 rounded-lg p-3 text-sm border bg-red-50 text-red-700 border-red-200"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <div>
              <p className="font-medium">Unable to sign in</p>
              <p className="text-[13px] leading-snug">{error}</p>
            </div>
          </div>
        )}

        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            autoComplete="email"
            className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            autoComplete="current-password"
            className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            required
            onKeyDown={(e) => {
              // not strictly needed because form handles Enter, but keeps UX snappy
              if (e.key === "Enter") {
                // the form onSubmit will run
              }
            }}
          />

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
