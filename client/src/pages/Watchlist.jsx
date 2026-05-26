import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { watchlistAPI } from "../utils/api";
import RecommendCard from "../components/RecommendCard";

const CATEGORIES = ["All", "Movie", "Series", "Book", "Podcast", "Music"];

function getTopEmotion(fingerprint) {
    if (!fingerprint) return null;
    let topEmotion = null;
    let maxVal = -1;
    const emotions = ["joy", "sadness", "anger", "fear", "surprise", "nostalgia", "curiosity", "calm"];
    for (const em of emotions) {
        if (fingerprint[em] > maxVal) {
            maxVal = fingerprint[em];
            topEmotion = em;
        }
    }
    return topEmotion;
}

export default function Watchlist() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("All");

    useEffect(() => {
        const fetchWatchlist = async () => {
            try {
                const res = await watchlistAPI.get();
                // Map the response to have isSaved initially true
                const data = res.data.watchlist.map(item => ({
                    ...item,
                    content: { ...item.content, isSaved: true }
                }));
                setItems(data);
            } catch (err) {
                console.error("Failed to fetch watchlist:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchWatchlist();
    }, []);

    const filteredItems = items.filter(item => {
        if (filter === "All") return true;
        return item.content.type.toLowerCase() === filter.toLowerCase();
    });

    if (loading) return <div className="loading-screen">Loading Watchlist...</div>;

    return (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.25rem" }}>
            <h1 style={{ fontSize: "2rem", color: "#333", marginBottom: "0.5rem" }}>Your Watchlist</h1>
            <p style={{ color: "#666", marginBottom: "2rem" }}>
                Everything you've saved, along with how you were feeling when you saved it.
            </p>

            {/* Filters */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`btn ${filter === cat ? "btn-primary" : "btn-outline"}`}
                        style={{ padding: "0.5rem 1rem", borderRadius: 20 }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 1rem", background: "#f9f9f9", borderRadius: 12 }}>
                    <h3 style={{ color: "#555", marginBottom: "1rem" }}>Your watchlist is empty</h3>
                    <p style={{ color: "#888", marginBottom: "2rem" }}>
                        Start tracking your mood and saving recommendations you like.
                    </p>
                    <Link to="/mood" className="btn btn-primary" style={{ padding: "0.8rem 1.5rem" }}>
                        Capture Mood Now
                    </Link>
                </div>
            ) : filteredItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#888" }}>
                    No {filter.toLowerCase()}s found in your watchlist.
                </div>
            ) : (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "1.5rem"
                }}>
                    {filteredItems.map(item => {
                        const topEmotion = getTopEmotion(item.session?.emotionFingerprint);
                        const emotionContextText = topEmotion 
                            ? `Saved when you were feeling ${topEmotion}`
                            : "Saved from a previous mood session";

                        return (
                            <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                {/* Context Banner */}
                                <div style={{
                                    background: "#F5F4FF",
                                    color: "#534AB7",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "8px",
                                    fontSize: "0.8rem",
                                    fontWeight: 500,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem"
                                }}>
                                    <span>💭</span>
                                    {emotionContextText}
                                </div>
                                
                                <RecommendCard item={item.content} sessionId={item.session?._id} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
