import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../utils/api";

// Registration steps: 0 = email, 1 = OTP, 2 = name+password
const REG_STEPS = ["Email", "Verify", "Account"];

export default function Auth() {
    const [mode, setMode] = useState("login"); // "login" | "register"
    const [regStep, setRegStep] = useState(0);

    // Login fields
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Register fields
    const [regEmail, setRegEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [verifiedToken, setVerifiedToken] = useState("");
    const [name, setName] = useState("");
    const [regPassword, setRegPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login, register } = useAuth();
    const navigate = useNavigate();

    const resetRegister = () => {
        setRegStep(0); setRegEmail(""); setOtp("");
        setVerifiedToken(""); setName(""); setRegPassword("");
        setError("");
    };

    // ── Login ──────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        setError(""); setLoading(true);
        try {
            await login(email, password);
            navigate("/mood");
        } catch (err) {
            setError(err.response?.data?.error || "Invalid email or password");
        } finally { setLoading(false); }
    };

    // ── Register Step 0: send OTP ──────────────
    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!regEmail.trim()) return setError("Enter your email first");
        setError(""); setLoading(true);
        try {
            await authAPI.sendOtp(regEmail.trim());
            setRegStep(1);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to send OTP. Try again.");
        } finally { setLoading(false); }
    };

    // ── Register Step 1: verify OTP ───────────
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) return setError("Enter the 6-digit OTP");
        setError(""); setLoading(true);
        try {
            const res = await authAPI.verifyOtp(regEmail.trim(), otp.trim());
            setVerifiedToken(res.data.verifiedToken);
            setRegStep(2);
        } catch (err) {
            setError(err.response?.data?.error || "Incorrect OTP. Try again.");
        } finally { setLoading(false); }
    };

    // ── Register Step 2: create account ───────
    const handleRegister = async (e) => {
        e.preventDefault();
        if (!name.trim()) return setError("Name required");
        if (regPassword.length < 6) return setError("Password min 6 characters");
        setError(""); setLoading(true);
        try {
            await register(name.trim(), regEmail.trim(), regPassword, verifiedToken);
            navigate("/mood");
        } catch (err) {
            setError(err.response?.data?.error || "Something went wrong");
            // If verifiedToken expired, go back to OTP step
            if (err.response?.data?.error?.includes("verification expired")) {
                setRegStep(1); setOtp(""); setVerifiedToken("");
            }
        } finally { setLoading(false); }
    };

    return (
        <div className="page" style={{ maxWidth: 420, paddingTop: "4rem" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>🎭</div>
                <h2>{mode === "login" ? "Welcome back" : "Create account"}</h2>
                <p className="muted" style={{ marginTop: 4 }}>
                    {mode === "login" ? "Sign in to see your mood history" : "Start discovering by mood"}
                </p>
            </div>

            <div className="card">

                {/* ── LOGIN ────────────────────────────── */}
                {mode === "login" && (
                    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div>
                            <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 5 }}>Email</label>
                            <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div>
                            <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 5 }}>Password</label>
                            <input type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                        {error && <div className="msg-error">{error}</div>}
                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? "Signing in…" : "Sign in"}
                        </button>
                    </form>
                )}

                {/* ── REGISTER — Step indicator ─────────── */}
                {mode === "register" && (
                    <>
                        {/* Step Pills */}
                        <div style={{ display: "flex", gap: 6, marginBottom: "1.5rem", alignItems: "center" }}>
                            {REG_STEPS.map((s, i) => (
                                <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, flex: i < 2 ? 1 : 0 }}>
                                    <div style={{
                                        width: 26, height: 26, borderRadius: "50%",
                                        background: i <= regStep ? "#7F77DD" : "#e8e8e8",
                                        color: i <= regStep ? "#fff" : "#aaa",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "0.78rem", fontWeight: 600, flexShrink: 0,
                                    }}>{i < regStep ? "✓" : i + 1}</div>
                                    <span style={{ fontSize: "0.8rem", color: i === regStep ? "#534AB7" : "#aaa", fontWeight: i === regStep ? 500 : 400 }}>{s}</span>
                                    {i < 2 && <div style={{ flex: 1, height: 1, background: "#e8e8e8" }} />}
                                </div>
                            ))}
                        </div>

                        {/* Step 0: Email */}
                        {regStep === 0 && (
                            <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div>
                                    <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 5 }}>Email</label>
                                    <input type="email" placeholder="you@email.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} required autoFocus />
                                </div>
                                <p style={{ fontSize: "0.82rem", color: "#888", margin: 0 }}>
                                    We'll send a 6-digit code to verify your email.
                                </p>
                                {error && <div className="msg-error">{error}</div>}
                                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                                    {loading ? "Sending OTP…" : "Send verification code →"}
                                </button>
                            </form>
                        )}

                        {/* Step 1: OTP */}
                        {regStep === 1 && (
                            <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
                                    <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>📬</div>
                                    <p style={{ fontSize: "0.9rem", color: "#555", margin: 0 }}>
                                        Code sent to <strong>{regEmail}</strong>
                                    </p>
                                    <p className="muted" style={{ fontSize: "0.8rem", margin: "4px 0 0" }}>Check your inbox and spam folder. Expires in 10 min.</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 5 }}>6-Digit Code</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="• • • • • •"
                                        value={otp}
                                        maxLength={6}
                                        onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                                        style={{ fontSize: "1.4rem", letterSpacing: "0.3em", textAlign: "center", fontFamily: "monospace" }}
                                        autoFocus
                                        required
                                    />
                                </div>
                                {error && <div className="msg-error">{error}</div>}
                                <button type="submit" className="btn btn-primary btn-full" disabled={loading || otp.length !== 6}>
                                    {loading ? "Verifying…" : "Verify code →"}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ fontSize: "0.85rem" }}
                                    onClick={() => { setRegStep(0); setOtp(""); setError(""); }}
                                >
                                    ← Change email / Resend
                                </button>
                            </form>
                        )}

                        {/* Step 2: Name + Password */}
                        {regStep === 2 && (
                            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div style={{ background: "#E1F5EE", borderRadius: 8, padding: "0.6rem 0.9rem", fontSize: "0.85rem", color: "#085041", display: "flex", gap: 8, alignItems: "center" }}>
                                    <span>✅</span> <span><strong>{regEmail}</strong> verified</span>
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 5 }}>Your Name</label>
                                    <input type="text" placeholder="What should we call you?" value={name} onChange={e => setName(e.target.value)} required autoFocus />
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 5 }}>Password</label>
                                    <input type="password" placeholder="Min 6 characters" value={regPassword} onChange={e => setRegPassword(e.target.value)} required />
                                </div>
                                {error && <div className="msg-error">{error}</div>}
                                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                                    {loading ? "Creating account…" : "🎭 Create my account"}
                                </button>
                            </form>
                        )}
                    </>
                )}

                <div className="divider" />

                <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#666" }}>
                    {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); resetRegister(); }}
                        style={{ background: "none", border: "none", color: "#7F77DD", fontWeight: 500, cursor: "pointer", fontSize: "0.875rem" }}
                    >
                        {mode === "login" ? "Sign up" : "Sign in"}
                    </button>
                </p>
            </div>
        </div>
    );
}