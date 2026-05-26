import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Auth() {
    const [mode, setMode] = useState("login"); // "login" | "register"
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (mode === "login") {
                await login(email, password);
            } else {
                if (!name.trim()) { setError("Name required"); setLoading(false); return; }
                await register(name, email, password);
            }
            navigate("/mood");
        } catch (err) {
            setError(err.response?.data?.error || "Something went wrong");
        } finally {
            setLoading(false);
        }
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
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {mode === "register" && (
                        <div>
                            <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 5 }}>Name</label>
                            <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                    )}
                    <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 5 }}>Email</label>
                        <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 5 }}>Password</label>
                        <input type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>

                    {error && <div className="msg-error">{error}</div>}

                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
                    </button>
                </form>

                <div className="divider" />

                <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#666" }}>
                    {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                        style={{ background: "none", border: "none", color: "#7F77DD", fontWeight: 500, cursor: "pointer", fontSize: "0.875rem" }}
                    >
                        {mode === "login" ? "Sign up" : "Sign in"}
                    </button>
                </p>
            </div>
        </div>
    );
}