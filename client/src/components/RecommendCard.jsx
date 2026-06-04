import { useState } from "react";
import { ratingAPI, watchlistAPI } from "../utils/api";

const TYPE_META = {
    movie: { label: "Movie", color: "#EEEDFE", text: "#3C3489" },
    series: { label: "Series", color: "#E6F1FB", text: "#0C447C" },
    book: { label: "Book", color: "#E1F5EE", text: "#085041" },
    podcast: { label: "Podcast", color: "#FAEEDA", text: "#633806" },
    music: { label: "Music", color: "#FBEAF0", text: "#72243E" },
};

export default function RecommendCard({ item, sessionId }) {
    const [rated, setRated] = useState(null); // 1, -1, or null
    const [loading, setLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(item.isSaved || false);
    const meta = TYPE_META[item.type] || TYPE_META.movie;

    const handleRate = async (rating) => {
        if (loading || rated !== null) return;
        setLoading(true);
        try {
            // Support both item.id (from recommendations) and item._id (from mongo directly)
            await ratingAPI.rate({ contentId: item.id || item._id, sessionId, rating });
            setRated(rating);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSave = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        setIsSaved(!isSaved); // Optimistic UI
        try {
            await watchlistAPI.toggle({ contentId: item.id || item._id, sessionId });
        } catch (err) {
            setIsSaved(isSaved); // Revert on failure
            console.error("Failed to toggle watchlist", err);
        }
    };

    return (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
            {/* Bookmark button */}
            <button
                onClick={handleToggleSave}
                style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: "rgba(255, 255, 255, 0.9)",
                    border: "none",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                    zIndex: 10,
                    transition: "transform 0.1s ease",
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.9)"}
                onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={isSaved ? "#534AB7" : "none"}
                    stroke="#534AB7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>
            {/* Image */}
            {item.imageUrl && (
                <img
                    src={item.imageUrl}
                    alt={item.title}
                    style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8 }}
                    onError={(e) => { e.target.style.display = "none"; }}
                />
            )}

            {/* Type badge */}
            <span className="badge" style={{ background: meta.color, color: meta.text, alignSelf: "flex-start" }}>
                {meta.label}
            </span>

            {/* Title */}
            <h3 style={{ fontSize: "1rem", fontWeight: 600, lineHeight: 1.3 }}>{item.title}</h3>

            {/* Feel description — the unique Sentio touch */}
            {item.feelDescription && (
                <p style={{ fontSize: "0.85rem", color: "#666", fontStyle: "italic", lineHeight: 1.5 }}>
                    "{item.feelDescription}"
                </p>
            )}

            {/* Standard description */}
            {item.description && (
                <p style={{ fontSize: "0.8rem", color: "#555", lineHeight: 1.4, marginTop: 4 }}>
                    {item.description.length > 120 ? item.description.substring(0, 120) + "..." : item.description}
                </p>
            )}

            {/* Meta info */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {item.language && item.language !== "en" && (
                    <span className="badge badge-coral">{item.language.toUpperCase()}</span>
                )}
                {item.durationMins > 0 && (
                    <span style={{ fontSize: "0.78rem", color: "#888" }}>{item.durationMins} min</span>
                )}
                <span style={{ fontSize: "0.78rem", color: "#aaa", marginLeft: "auto" }}>
                    {item.matchScore != null ? `${Math.round(item.matchScore * 100)}% match` : ""}
                </span>
            </div>

            {/* Rating buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                    onClick={() => handleRate(1)}
                    disabled={loading || rated !== null}
                    style={{
                        flex: 1, padding: "0.45rem", borderRadius: 8,
                        border: `1.5px solid ${rated === 1 ? "#1D9E75" : "#e8e8e8"}`,
                        background: rated === 1 ? "#E1F5EE" : "#fff",
                        color: rated === 1 ? "#085041" : "#666",
                        cursor: rated !== null ? "default" : "pointer",
                        fontSize: "0.85rem", fontWeight: 500,
                    }}
                >
                    👍 {rated === 1 ? "Liked!" : "This fits"}
                </button>
                <button
                    onClick={() => handleRate(-1)}
                    disabled={loading || rated !== null}
                    style={{
                        flex: 1, padding: "0.45rem", borderRadius: 8,
                        border: `1.5px solid ${rated === -1 ? "#E24B4A" : "#e8e8e8"}`,
                        background: rated === -1 ? "#FCEBEB" : "#fff",
                        color: rated === -1 ? "#791F1F" : "#666",
                        cursor: rated !== null ? "default" : "pointer",
                        fontSize: "0.85rem", fontWeight: 500,
                    }}
                >
                    👎 {rated === -1 ? "Noted!" : "Not for me"}
                </button>
            </div>
        </div>
    );
}