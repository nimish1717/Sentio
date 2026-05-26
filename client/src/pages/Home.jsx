import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const currentHour = new Date().getHours();
    const hasPostedToday = user?.lastSessionDate && new Date(user.lastSessionDate).toDateString() === new Date().toDateString();
    const showStreakWarning = user?.currentStreak > 0 && currentHour >= 21 && !hasPostedToday;

    return (
        <div className="page" style={{ textAlign: "center", paddingTop: showStreakWarning ? "2rem" : "5rem" }}>

            {showStreakWarning && (
                <div style={{
                    background: "#FCEBEB",
                    color: "#D85A30",
                    padding: "0.8rem 1rem",
                    borderRadius: "8px",
                    maxWidth: 480,
                    margin: "0 auto 2rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    fontWeight: "600",
                    border: "1px solid #F9D0C4",
                    boxShadow: "0 4px 10px rgba(216, 90, 48, 0.1)"
                }}>
                    <span style={{ fontSize: "1.2rem" }}>⏳</span>
                    Your {user.currentStreak}-day streak ends at midnight!
                    <button 
                        onClick={() => navigate("/mood")}
                        style={{
                            background: "none", border: "none", 
                            color: "#D85A30", textDecoration: "underline", 
                            fontWeight: 700, cursor: "pointer", padding: 0, marginLeft: 5
                        }}
                    >
                        Save it now
                    </button>
                </div>
            )}

            {/* Hero */}
            <div style={{ marginBottom: "3rem" }}>
                <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🎭</div>
                <h1 style={{ marginBottom: "1rem" }}>
                    What are you in the<br />
                    <span style={{ color: "#7F77DD" }}>mood for tonight?</span>
                </h1>
                <p style={{ color: "#666", fontSize: "1.1rem", maxWidth: 480, margin: "0 auto 2rem", lineHeight: 1.7 }}>
                    Not what you watched before. How you feel <em>right now</em>.
                    Sentio recommends movies, books, and podcasts
                    matched to your current emotional state.
                </p>

                <button
                    className="btn btn-primary btn-large"
                    onClick={() => navigate(user ? "/mood" : "/auth")}
                >
                    Tell me how you feel →
                </button>
            </div>

            {/* How it works */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", maxWidth: 700, margin: "0 auto 3rem" }}>
                {[
                    { step: "1", icon: "💬", title: "Describe your mood", desc: "Type how you're feeling — freely, no format." },
                    { step: "2", icon: "🃏", title: "Pick emotion cards", desc: "Select all the feelings that match right now." },
                    { step: "3", icon: "🎯", title: "Get your pack", desc: "Movies, books, podcasts matched to your state." },
                ].map(item => (
                    <div key={item.step} className="card" style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{item.icon}</div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#7F77DD", letterSpacing: "0.06em", marginBottom: 4 }}>
                            STEP {item.step}
                        </div>
                        <h3 style={{ marginBottom: 6, fontSize: "0.95rem" }}>{item.title}</h3>
                        <p style={{ color: "#666", fontSize: "0.85rem", lineHeight: 1.5 }}>{item.desc}</p>
                    </div>
                ))}
            </div>

            {/* Watch together callout */}
            <div className="card" style={{ maxWidth: 480, margin: "0 auto", background: "#EEEDFE", border: "none", textAlign: "left" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.5rem" }}>👥</span>
                    <div>
                        <h3 style={{ color: "#3C3489", marginBottom: 4 }}>Watching with friends?</h3>
                        <p style={{ color: "#534AB7", fontSize: "0.875rem", lineHeight: 1.5 }}>
                            Everyone submits their mood. Sentio finds what works for the whole group. No more arguing.
                        </p>
                        <button
                            className="btn"
                            onClick={() => navigate("/together")}
                            style={{ marginTop: 10, background: "#534AB7", color: "#fff", fontSize: "0.85rem", padding: "0.4rem 1rem" }}
                        >
                            Try Watch Together →
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}