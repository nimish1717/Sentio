// ============================================================
// SpotifyButton — generates a mood playlist on Spotify
// Usage: <SpotifyButton sessionId="..." fingerprint={...} />
// ============================================================

import { useState, useEffect } from "react";
import { spotifyAPI } from "../utils/api";

const SPOTIFY_GREEN = "#1DB954";
const SPOTIFY_DARK  = "#158a3e";

export default function SpotifyButton({ sessionId, fingerprint }) {
    const [status, setStatus] = useState(null);   // null | "connected" | "disconnected"
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);   // { playlistUrl, trackCount }
    const [error, setError] = useState("");

    // Check if Spotify is already connected
    useEffect(() => {
        spotifyAPI.status()
            .then(res => setStatus(res.data.connected ? "connected" : "disconnected"))
            .catch(() => setStatus("disconnected"));
    }, []);

    // Handle ?spotify_connected=true redirect from OAuth callback
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("spotify_connected") === "true") {
            setStatus("connected");
            // Clean the URL
            window.history.replaceState({}, "", window.location.pathname);
        }
        if (params.get("spotify_error")) {
            setError(decodeURIComponent(params.get("spotify_error")));
            window.history.replaceState({}, "", window.location.pathname);
        }
    }, []);

    const handleConnect = () => {
        // Save current page so SpotifyCallback can return here
        sessionStorage.setItem("spotify_return_to", window.location.pathname);
        window.location.href = spotifyAPI.getAuthUrl();
    };

    const handleGenerate = async () => {
        setLoading(true);
        setError("");
        setResult(null);
        try {
            const payload = sessionId
                ? { sessionId }
                : { fingerprint };
            const res = await spotifyAPI.generatePlaylist(payload);
            setResult(res.data);
        } catch (err) {
            if (err.response?.data?.code === "SPOTIFY_NOT_CONNECTED") {
                setStatus("disconnected");
                setError("Spotify session expired. Please reconnect.");
            } else {
                setError(err.response?.data?.error || "Failed to create playlist. Try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        await spotifyAPI.disconnect();
        setStatus("disconnected");
        setResult(null);
    };

    // ── Not yet loaded
    if (status === null) return null;

    // ── Playlist created ✅
    if (result) {
        return (
            <div style={{
                background: "#f0fdf4",
                border: "1.5px solid #bbf7d0",
                borderRadius: 12,
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
            }}>
                <span style={{ fontSize: "1.4rem" }}>🎵</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#166534", fontSize: "0.9rem" }}>
                        Playlist created! {result.trackCount} tracks matched your mood.
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#15803d", marginTop: 2 }}>
                        Now in your Spotify library
                    </div>
                </div>
                <a
                    href={result.playlistUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                        background: SPOTIFY_GREEN,
                        color: "#fff",
                        border: "none",
                        borderRadius: 999,
                        padding: "0.45rem 1rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                    }}
                >
                    Open in Spotify ↗
                </a>
                <button
                    onClick={() => setResult(null)}
                    style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "0.8rem" }}
                >
                    Create another
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {/* Main button */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>

                {status === "disconnected" ? (
                    <button
                        onClick={handleConnect}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: SPOTIFY_GREEN,
                            color: "#fff",
                            border: "none",
                            borderRadius: 999,
                            padding: "0.5rem 1.1rem",
                            fontSize: "0.88rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "background 0.2s",
                        }}
                        onMouseOver={e => e.currentTarget.style.background = SPOTIFY_DARK}
                        onMouseOut={e => e.currentTarget.style.background = SPOTIFY_GREEN}
                    >
                        <SpotifyIcon />
                        Connect Spotify to Generate Playlist
                    </button>
                ) : (
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: loading ? "#a7f3c0" : SPOTIFY_GREEN,
                            color: "#fff",
                            border: "none",
                            borderRadius: 999,
                            padding: "0.5rem 1.1rem",
                            fontSize: "0.88rem",
                            fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                            transition: "background 0.2s",
                        }}
                        onMouseOver={e => { if (!loading) e.currentTarget.style.background = SPOTIFY_DARK; }}
                        onMouseOut={e => { if (!loading) e.currentTarget.style.background = SPOTIFY_GREEN; }}
                    >
                        <SpotifyIcon />
                        {loading ? "Creating playlist…" : "🎵 Generate Mood Playlist"}
                    </button>
                )}

                {status === "connected" && (
                    <button
                        onClick={handleDisconnect}
                        style={{
                            background: "none", border: "none", color: "#aaa",
                            fontSize: "0.78rem", cursor: "pointer", padding: 0,
                        }}
                        title="Disconnect Spotify"
                    >
                        disconnect
                    </button>
                )}
            </div>

            {error && (
                <div style={{ fontSize: "0.82rem", color: "#dc2626", paddingLeft: 2 }}>
                    {error}
                </div>
            )}

            {status === "disconnected" && (
                <p style={{ fontSize: "0.78rem", color: "#aaa", margin: 0, paddingLeft: 2 }}>
                    Connects to your Spotify to create a private playlist matched to this mood.
                </p>
            )}
        </div>
    );
}

function SpotifyIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
    );
}
