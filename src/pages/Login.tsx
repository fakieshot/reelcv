import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, firestore } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useLocation } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verifyEmailFlag = searchParams.get("verifyEmail");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(verifyEmailFlag ? "" : "");
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const verifyMsg = params.get("verifyEmail");
  const justVerified = params.get("verified");



  
  const handleLogin = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // Check email verification
      if (!user.emailVerified) {
        setError("Please verify your email before logging in.");
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Fetch role
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      if (!userDoc.exists()) throw new Error("User data not found");
      const { role } = userDoc.data();

      // Redirect to home or role-based dashboard
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 space-y-4">
        <h1 className="text-3xl font-bold text-center text-gray-800">Login to ReelCV</h1>    
        {info && <p className="text-green-600 text-sm text-center">{info}</p>}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
       
        {(verifyMsg || justVerified) && (
          <div
            className={`rounded-lg p-3 text-sm border ${
              justVerified
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
            }`}
          >
            {justVerified
              ? "Email verified! You can sign in now."
              : "We’ve sent you a verification link. Please check your inbox (and spam)."}
          </div>
        )}
        {/* ---------------------------------------- */}
       
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </div>
    </div>
  );
}
