// ============================================================
// Sentio — Spotify Routes
//
// GET  /api/spotify/auth              → redirect to Spotify login
// GET  /api/spotify/callback          → handle OAuth callback
// GET  /api/spotify/status            → check if connected
// POST /api/spotify/generate-playlist → create playlist from session
// DELETE /api/spotify/disconnect      → remove Spotify tokens
// ============================================================

const router = require("express").Router();
const axios = require("axios");
const auth = require("../middleware/auth");
const { User, MoodSession } = require("../models");
const { generateMoodPlaylist } = require("../utils/spotifyClient");

const SCOPES = [
    "playlist-modify-public",
    "playlist-modify-private",
    "user-read-private",
    "user-read-email",
].join(" ");

// ── Step 1: Redirect user to Spotify login ────────────────
// GET /api/spotify/auth?token=<jwt>
// We pass the JWT as a query param so we can retrieve userId in callback
router.get("/auth", auth, (req, res) => {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope: SCOPES,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        state: req.userId, // pass userId as state — safe for this use case
        show_dialog: false,
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// ── Step 2: Client calls this after receiving code from Spotify ────
// POST /api/spotify/exchange-code
// Body: { code } — the authorization code from Spotify's redirect
// Auth: user's JWT (they must be logged in)
router.post("/exchange-code", auth, async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "code required" });

    try {
        const params = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        });

        const creds = Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64");

        const tokenRes = await axios.post(
            "https://accounts.spotify.com/api/token",
            params.toString(),
            {
                headers: {
                    Authorization: `Basic ${creds}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const { access_token, refresh_token, expires_in } = tokenRes.data;

        // Get Spotify user profile
        const profileRes = await axios.get("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        // Save tokens to user record
        await User.findByIdAndUpdate(req.userId, {
            spotifyAccessToken:  access_token,
            spotifyRefreshToken: refresh_token,
            spotifyTokenExpiry:  new Date(Date.now() + expires_in * 1000),
            spotifyUserId:       profileRes.data.id,
        });

        res.json({ connected: true, spotifyUserId: profileRes.data.id });
    } catch (err) {
        const spotifyError = err.response?.data;
        console.error("Spotify exchange-code error:", JSON.stringify(spotifyError || err.message));
        console.error("Redirect URI used:", process.env.SPOTIFY_REDIRECT_URI);
        res.status(500).json({
            error: "Failed to exchange code with Spotify",
            detail: spotifyError?.error_description || spotifyError?.error || err.message,
        });
    }
});

// ── Check Spotify connection status ───────────────────────
// GET /api/spotify/status
router.get("/status", auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select(
            "spotifyAccessToken spotifyTokenExpiry spotifyUserId"
        );
        const connected = !!user?.spotifyAccessToken;
        const expired = connected && user.spotifyTokenExpiry && new Date() >= new Date(user.spotifyTokenExpiry);

        res.json({
            connected,
            // Don't expose actual tokens
            spotifyUserId: user?.spotifyUserId || null,
            needsRefresh: expired,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Generate playlist from session fingerprint ────────────
// POST /api/spotify/generate-playlist
// Body: { sessionId } OR { fingerprint } directly
router.post("/generate-playlist", auth, async (req, res) => {
    try {
        const { sessionId, fingerprint: directFingerprint } = req.body;

        let fingerprint = directFingerprint;
        let sessionDate = null;

        if (sessionId && !directFingerprint) {
            const session = await MoodSession.findOne({
                _id: sessionId,
                userId: req.userId,
            });
            if (!session) return res.status(404).json({ error: "Session not found" });
            fingerprint = session.emotionFingerprint;
            sessionDate = session.createdAt;
        }

        if (!fingerprint) return res.status(400).json({ error: "fingerprint or sessionId required" });

        const result = await generateMoodPlaylist(req.userId, fingerprint, sessionDate);

        res.json({
            ...result,
            message: "Playlist created in your Spotify account!",
        });
    } catch (err) {
        console.error("Generate playlist error:", err.message);

        if (err.message === "Spotify not connected") {
            return res.status(401).json({ error: "Spotify not connected", code: "SPOTIFY_NOT_CONNECTED" });
        }
        if (err.response?.status === 401) {
            return res.status(401).json({ error: "Spotify token expired", code: "SPOTIFY_NOT_CONNECTED" });
        }

        res.status(500).json({ error: err.message || "Failed to generate playlist" });
    }
});

// ── Disconnect Spotify ─────────────────────────────────────
// DELETE /api/spotify/disconnect
router.delete("/disconnect", auth, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.userId, {
            $unset: {
                spotifyAccessToken: "",
                spotifyRefreshToken: "",
                spotifyTokenExpiry: "",
                spotifyUserId: "",
            },
        });
        res.json({ message: "Spotify disconnected" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
