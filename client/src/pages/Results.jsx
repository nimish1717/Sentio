import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EmotionRadar from "../components/EmotionRadar";
import RecommendCard from "../components/RecommendCard";
import { recommendAPI } from "../utils/api";

const TYPE_ORDER = ["movie", "series", "book", "podcast", "music"];

export default function Results() {
    const { sessionId } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");   // content type filter
    const [mode, setMode] = useState("lean");   // lean | contrast

    const fetchRecs = async (currentMode) => {
        setLoading(true);
        setError("");
        try {
            const isRoom = sessionId.startsWith("room-");
            const reqSessionId = isRoom ? undefined : sessionId;
            const reqRoomId = isRoom ? sessionId.replace("room-", "") : undefined;

            const res = await recommendAPI.get(reqSessionId || reqRoomId, {
                ...(filter !== "all" && { type: filter }),
                mode: currentMode,
                ...(isRoom && { roomId: reqRoomId }), // If it's a room, we explicitly pass roomId in filters which `api.js` appends
            });
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || "Could not load recommendations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRecs(mode); }, [sessionId, filter]);

    const handleModeToggle = (newMode) => {
        setMode(newMode);
        fetchRecs(newMode);
    };

    // Group recommendations by type
    const grouped = (data?.recommendations || []).reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item);
        return acc;
    }, {});

    return (
        <div className="page-wide">

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h2>Your mood pack is ready</h2>
                    <p className="muted">Matched to how you're feeling right now — not your history.</p>
                </div>
                <button className="btn btn-outline" onClick={() => navigate("/mood")}>
                    ← New mood
                </button>
            </div>

            {/* Emotion radar */}
            {data?.fingerprint && (
                <div className="card" style={{ marginBottom: "1.5rem" }}>
                    <h3 style={{ marginBottom: "0.25rem" }}>Your emotional fingerprint</h3>
                    <p className="muted" style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
                        This is how your mood looks right now across 8 dimensions.
                    </p>
                    <EmotionRadar fingerprint={data.fingerprint} size={280} />
                </div>
            )}

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "#888", marginRight: 4 }}>Show:</span>
                {["all", "movie", "series", "book", "podcast", "music"].map(t => (
                    <button key={t} onClick={() => setFilter(t)}
                        style={{
                            padding: "5px 14px", borderRadius: 999, border: "1.5px solid",
                            borderColor: filter === t ? "#7F77DD" : "#e8e8e8",
                            background: filter === t ? "#EEEDFE" : "#fff",
                            color: filter === t ? "#3C3489" : "#666",
                            fontSize: "0.82rem", fontWeight: 500, cursor: "pointer",
                            textTransform: "capitalize",
                        }}>
                        {t === "all" ? "Everything" : t}
                    </button>
                ))}

                {/* Contrast mode toggle */}
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    {[["lean", "🌊 Lean in"], ["contrast", "⚡ Contrast"]].map(([val, label]) => (
                        <button key={val} onClick={() => handleModeToggle(val)}
                            style={{
                                padding: "5px 12px", borderRadius: 999, border: "1.5px solid",
                                borderColor: mode === val ? "#D85A30" : "#e8e8e8",
                                background: mode === val ? "#FAECE7" : "#fff",
                                color: mode === val ? "#712B13" : "#666",
                                fontSize: "0.82rem", fontWeight: 500, cursor: "pointer",
                            }}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {loading && <div className="spinner" />}

            {/* Error */}
            {error && (
                <div className="msg-error">
                    {error}
                    {error.includes("No content") && (
                        <span> — <a href="/content/seed" style={{ color: "#791F1F" }}>seed some content first</a></span>
                    )}
                </div>
            )}

            {/* Results grouped by type */}
            {!loading && !error && data && (
                TYPE_ORDER.filter(type => grouped[type]).map(type => (
                    <div key={type} style={{ marginBottom: "2rem" }}>
                        <h3 style={{ marginBottom: "0.75rem", textTransform: "capitalize", color: "#444" }}>
                            {type === "movie" ? "🎬" : type === "series" ? "📺" : type === "book" ? "📖" : type === "podcast" ? "🎙" : "🎵"} {type}s
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
                            {grouped[type].map(item => (
                                <RecommendCard key={item.id} item={item} sessionId={sessionId} />
                            ))}
                        </div>
                    </div>
                ))
            )}

            {!loading && !error && data?.recommendations?.length === 0 && (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                    <p style={{ color: "#888" }}>No content found for these filters.</p>
                    <button className="btn btn-outline" style={{ marginTop: "1rem" }} onClick={() => setFilter("all")}>
                        Show all types
                    </button>
                </div>
            )}
        </div>
    );
}