import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import EmotionRadar from "../components/EmotionRadar";
import { shareAPI } from "../utils/api";

const EMOTION_META = {
    joy: { emoji: "✨", color: "#FAEEDA", label: "Joyful" },
    sadness: { emoji: "🌧", color: "#E6F1FB", label: "Sad" },
    anger: { emoji: "🔥", color: "#FCEBEB", label: "Angry" },
    fear: { emoji: "🌀", color: "#FBEAF0", label: "Anxious" },
    surprise: { emoji: "⚡", color: "#EEEDFE", label: "Surprised" },
    nostalgia: { emoji: "🌅", color: "#FAEEDA", label: "Nostalgic" },
    curiosity: { emoji: "🔭", color: "#E1F5EE", label: "Curious" },
    calm: { emoji: "☀️", color: "#EAF3DE", label: "Calm" },
};

export default function SharedSession() {
    const { token } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        shareAPI.getSharedSession(token)
            .then(res => setData(res.data))
            .catch(err => setError(err.response?.data?.error || "This share link has expired or doesn't exist."))
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) return (
        <div className="loading-screen">
            <div className="spinner" />
        </div>
    );

    if (error) return (
        <div className="page" style={{ textAlign: "center", paddingTop: "5rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔗</div>
            <h2>Link Not Found</h2>
            <p className="muted" style={{ marginBottom: "2rem" }}>{error}</p>
            <Link to="/" className="btn btn-primary">Go to Sentio</Link>
        </div>
    );

    const meta = EMOTION_META[data.topEmotion] || { emoji: "🎭", color: "#EEEDFE", label: data.topEmotion };
    const date = new Date(data.date).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric"
    });

    return (
        <div className="page" style={{ maxWidth: 600, paddingTop: "3rem" }}>

            {/* Header card */}
            <div className="card" style={{
                background: meta.color,
                border: "none",
                textAlign: "center",
                marginBottom: "1.5rem",
                padding: "2rem",
            }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>{meta.emoji}</div>
                <h2 style={{ marginBottom: "0.25rem", fontSize: "1.6rem" }}>
                    {data.userName} was feeling <span style={{ color: "#3C3489", textTransform: "capitalize" }}>{meta.label}</span>
                </h2>
                <p className="muted" style={{ margin: 0 }}>{date}</p>
            </div>

            {/* Emotion cards */}
            {data.selectedCards?.length > 0 && (
                <div className="card" style={{ marginBottom: "1.5rem" }}>
                    <h3 style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Feelings tagged
                    </h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {data.selectedCards.map(card => (
                            <span key={card} style={{
                                background: "#EEEDFE", color: "#3C3489",
                                padding: "0.35rem 0.75rem",
                                borderRadius: "20px",
                                fontSize: "0.85rem",
                                fontWeight: 500,
                                textTransform: "capitalize",
                            }}>
                                {card}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Radar */}
            {data.fingerprint && (
                <div className="card" style={{ marginBottom: "1.5rem" }}>
                    <h3 style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Emotion Fingerprint
                    </h3>
                    <EmotionRadar fingerprint={data.fingerprint} size={260} />
                </div>
            )}

            {/* CTA */}
            <div className="card" style={{ background: "#EEEDFE", border: "none", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>🎭</div>
                <h3 style={{ color: "#3C3489", marginBottom: "0.5rem" }}>Discover content by how you feel</h3>
                <p style={{ color: "#534AB7", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                    Get movie, book & podcast recommendations matched to your exact emotional state.
                </p>
                <Link to="/auth" className="btn btn-primary" style={{ display: "inline-block" }}>
                    Try Sentio Free →
                </Link>
            </div>

        </div>
    );
}
