import { useState, useEffect } from "react";
import useDebounce from "../utils/useDebounce";
import { searchAPI } from "../utils/api";
import RecommendCard from "../components/RecommendCard";

const CATEGORIES = ["All", "Movie", "Series", "Book", "Podcast", "Music"];

export default function Search() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);   // null | "waking" | "failed"
    const [retrying, setRetrying] = useState(false);
    const [filter, setFilter] = useState("All");
    const [recentSearches, setRecentSearches] = useState([]);
    const debouncedQuery = useDebounce(query, 500);

    // Load recent searches from local storage
    useEffect(() => {
        const saved = localStorage.getItem("sentio_recent_searches");
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {}
        }
    }, []);

    // Perform search when debounced query changes
    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.trim() === "") {
            setResults([]);
            return;
        }

        const fetchResults = async (isRetry = false) => {
            setLoading(true);
            if (!isRetry) setError(null);
            try {
                const res = await searchAPI.search(debouncedQuery, filter);
                setResults(res.data.results || []);
                setError(null);
                setRetrying(false);

                // Save to recent searches (if successful and not already first)
                setRecentSearches(prev => {
                    const q = debouncedQuery.trim();
                    const filtered = prev.filter(item => item.toLowerCase() !== q.toLowerCase());
                    const newRecent = [q, ...filtered].slice(0, 5);
                    localStorage.setItem("sentio_recent_searches", JSON.stringify(newRecent));
                    return newRecent;
                });

            } catch (err) {
                console.error("Search failed:", err);
                const status = err?.response?.status;
                if (status === 503 || !status) {
                    // ML service cold-starting — auto-retry once after 8 seconds
                    setError("waking");
                    if (!isRetry) {
                        setRetrying(true);
                        setTimeout(() => fetchResults(true), 8000);
                    } else {
                        setRetrying(false);
                    }
                } else {
                    setError("failed");
                    setRetrying(false);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery, filter]);

    return (
        <div className="page" style={{ maxWidth: 800, margin: "0 auto", paddingTop: "3rem" }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
                <h1 style={{ marginBottom: "1rem", fontSize: "2.2rem" }}>Search by feeling</h1>
                <p className="muted" style={{ maxWidth: 480, margin: "0 auto 2rem", lineHeight: 1.6 }}>
                    Don't search for titles. Search for the emotion you want.
                    Try <em>"something that makes my brain hurt in a good way"</em>.
                </p>

                <div style={{ position: "relative", maxWidth: 600, margin: "0 auto" }}>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Describe what you want to feel..."
                        style={{
                            width: "100%",
                            padding: "1.2rem 1.5rem",
                            fontSize: "1.1rem",
                            borderRadius: "12px",
                            border: "2px solid #E1E0F5",
                            outline: "none",
                            boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                            transition: "all 0.2s"
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#7F77DD"}
                        onBlur={(e) => e.target.style.borderColor = "#E1E0F5"}
                    />
                    
                    {loading && (
                        <div style={{ position: "absolute", right: "1.5rem", top: "50%", transform: "translateY(-50%)" }}>
                            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "1.5rem", flexWrap: "wrap" }}>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`btn ${filter === cat ? "btn-primary" : "btn-outline"}`}
                            style={{ padding: "0.4rem 1rem", borderRadius: 20, fontSize: "0.85rem" }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Recent Searches Chips */}
                {recentSearches.length > 0 && query.trim() === "" && (
                    <div style={{ marginTop: "1.5rem", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.85rem", color: "#888", display: "flex", alignItems: "center", marginRight: "0.5rem" }}>
                            Recent:
                        </span>
                        {recentSearches.map((search, idx) => (
                            <button
                                key={idx}
                                onClick={() => setQuery(search)}
                                style={{
                                    background: "#EEEDFE",
                                    color: "#534AB7",
                                    border: "none",
                                    borderRadius: "16px",
                                    padding: "0.4rem 0.8rem",
                                    fontSize: "0.85rem",
                                    cursor: "pointer",
                                    transition: "background 0.2s"
                                }}
                                onMouseOver={(e) => e.target.style.background = "#E1E0F5"}
                                onMouseOut={(e) => e.target.style.background = "#EEEDFE"}
                            >
                                {search}
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                localStorage.removeItem("sentio_recent_searches");
                                setRecentSearches([]);
                            }}
                            style={{
                                background: "transparent",
                                color: "#888",
                                border: "1px dashed #ccc",
                                borderRadius: "16px",
                                padding: "0.4rem 0.8rem",
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                marginLeft: "0.5rem",
                                transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => { e.target.style.borderColor = "#888"; e.target.style.color = "#555"; }}
                            onMouseOut={(e) => { e.target.style.borderColor = "#ccc"; e.target.style.color = "#888"; }}
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Error / Waking-up Banner */}
            {error === "waking" && query.trim() !== "" && (
                <div style={{
                    background: "linear-gradient(135deg, #FFF7E6, #FFF0CC)",
                    border: "1px solid #FFC76D",
                    borderRadius: "12px",
                    padding: "1.2rem 1.5rem",
                    marginBottom: "1.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    textAlign: "left"
                }}>
                    <span style={{ fontSize: "1.6rem" }}>☕</span>
                    <div>
                        <strong style={{ color: "#8A5700" }}>Our AI is waking up…</strong>
                        <p style={{ margin: "0.2rem 0 0", fontSize: "0.9rem", color: "#996300" }}>
                            {retrying
                                ? "Retrying automatically in a moment, hang tight!"
                                : "It took too long this time. Try searching again."}
                        </p>
                    </div>
                    {retrying && (
                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, marginLeft: "auto", flexShrink: 0 }} />
                    )}
                </div>
            )}

            {error === "failed" && query.trim() !== "" && (
                <div style={{
                    background: "#FFF0F0",
                    border: "1px solid #FFB3B3",
                    borderRadius: "12px",
                    padding: "1rem 1.5rem",
                    marginBottom: "1.5rem",
                    color: "#8B0000",
                    fontSize: "0.9rem"
                }}>
                    ⚠️ Something went wrong. Please try again.
                </div>
            )}

            {/* Results Grid */}
            {query.trim() !== "" && (
                <div>
                    <h3 style={{ marginBottom: "1.5rem", color: "#444" }}>
                        {loading
                            ? "Finding matches…"
                            : error
                            ? ""
                            : results.length > 0
                            ? "Top Matches"
                            : "No matches found"}
                    </h3>

                    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                        {results.map((content) => (
                            <RecommendCard key={content.id} item={content} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
