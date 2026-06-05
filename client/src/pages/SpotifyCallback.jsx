// ============================================================
// SpotifyCallback — handles Spotify OAuth redirect
// Route: /spotify/callback?code=xxx
// Flow: reads code → POSTs to server → redirects back to app
// ============================================================

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { spotifyAPI } from "../utils/api";

export default function SpotifyCallback() {
    const navigate = useNavigate();
    const [status, setStatus] = useState("Connecting to Spotify…");
    const [error, setError] = useState(null);
    const exchanged = useRef(false); // prevent double-fire (React StrictMode)

    useEffect(() => {
        if (exchanged.current) return; // already ran — skip
        exchanged.current = true;

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const errorParam = params.get("error");

        if (errorParam) {
            setError(`Spotify denied access: ${errorParam}`);
            setTimeout(() => navigate("/"), 3000);
            return;
        }

        if (!code) {
            setError("No authorization code received from Spotify.");
            setTimeout(() => navigate("/"), 3000);
            return;
        }

        // Exchange the code for tokens via server
        spotifyAPI.exchangeCode(code)
            .then(() => {
                setStatus("✅ Spotify connected!");
                const returnTo = sessionStorage.getItem("spotify_return_to") || "/";
                sessionStorage.removeItem("spotify_return_to");
                setTimeout(() => navigate(returnTo + "?spotify_connected=true"), 1200);
            })
            .catch((err) => {
                const detail = err.response?.data?.detail || err.response?.data?.error || "Failed to connect Spotify";
                console.error("SpotifyCallback error:", detail);
                setError(detail);
                setTimeout(() => navigate("/"), 3500);
            });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="page" style={{ textAlign: "center", paddingTop: "6rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>
                {error ? "❌" : "🎵"}
            </div>

            {error ? (
                <>
                    <h2 style={{ color: "#dc2626", marginBottom: "0.5rem" }}>Connection Failed</h2>
                    <p className="muted" style={{ maxWidth: 400, margin: "0 auto" }}>{error}</p>
                    <p className="muted" style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>Redirecting you back…</p>
                </>
            ) : (
                <>
                    <h2 style={{ marginBottom: "0.5rem" }}>{status}</h2>
                    {status !== "✅ Spotify connected!" && (
                        <div className="spinner" style={{ margin: "1rem auto" }} />
                    )}
                    <p className="muted">Taking you back to your results…</p>
                </>
            )}
        </div>
    );
}
