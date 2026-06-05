// ============================================================
// Sentio — Spotify API Client
// Handles token refresh + all Spotify API calls
// ============================================================

const axios = require("axios");
const { User } = require("../models");

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";

// ── Emotion fingerprint → Spotify audio features ────────────
// Maps Sentio 0-1 emotion values to Spotify's 0-1 audio features
function emotionToAudioFeatures(fp) {
    const joy = fp.joy || 0;
    const sadness = fp.sadness || 0;
    const anger = fp.anger || 0;
    const fear = fp.fear || 0;
    const surprise = fp.surprise || 0;
    const nostalgia = fp.nostalgia || 0;
    const curiosity = fp.curiosity || 0;
    const calm = fp.calm || 0;

    // valence: how happy the music sounds (joy↑ sadness↓)
    const valence = Math.max(0, Math.min(1,
        joy * 0.8 + calm * 0.3 + surprise * 0.2 - sadness * 0.7 - anger * 0.3 + 0.1
    ));

    // energy: intensity and power (anger↑ fear↑ calm↓)
    const energy = Math.max(0, Math.min(1,
        anger * 0.7 + surprise * 0.5 + fear * 0.3 + joy * 0.3 - calm * 0.6 - sadness * 0.2 + 0.2
    ));

    // danceability: rhythmic suitability (joy↑ anger moderate)
    const danceability = Math.max(0, Math.min(1,
        joy * 0.6 + surprise * 0.4 + anger * 0.2 - sadness * 0.3 - calm * 0.1 + 0.2
    ));

    // acousticness: acoustic vs electronic (nostalgia↑ calm↑ anger↓)
    const acousticness = Math.max(0, Math.min(1,
        nostalgia * 0.7 + calm * 0.5 + sadness * 0.3 - anger * 0.4 - surprise * 0.2
    ));

    // instrumentalness: no lyrics (curiosity↑ calm↑)
    const instrumentalness = Math.max(0, Math.min(1,
        curiosity * 0.4 + calm * 0.3 - joy * 0.2 - anger * 0.3
    ));

    return { valence, energy, danceability, acousticness, instrumentalness };
}

// ── Pick seed genres based on top emotion ─────────────────
function emotionToSeedGenres(fp) {
    const emotions = Object.entries(fp).sort((a, b) => b[1] - a[1]);
    const top = emotions[0][0];

    const genreMap = {
        joy:       ["pop", "happy", "dance"],
        sadness:   ["sad", "acoustic", "indie"],
        anger:     ["metal", "rock", "punk"],
        fear:      ["ambient", "dark-ambient", "electronic"],
        surprise:  ["alternative", "indie-pop", "new-wave"],
        nostalgia: ["classic-rock", "soul", "folk"],
        curiosity: ["jazz", "classical", "world-music"],
        calm:      ["chill", "ambient", "acoustic"],
    };

    return (genreMap[top] || ["pop"]).slice(0, 2).join(",");
}

// ── Refresh an expired access token ───────────────────────
async function refreshAccessToken(userId) {
    const user = await User.findById(userId).select("+spotifyRefreshToken");
    if (!user?.spotifyRefreshToken) throw new Error("No Spotify refresh token found");

    const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.spotifyRefreshToken,
    });

    const creds = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const res = await axios.post(`${SPOTIFY_ACCOUNTS}/api/token`, params.toString(), {
        headers: {
            Authorization: `Basic ${creds}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    const { access_token, expires_in } = res.data;
    const expiry = new Date(Date.now() + expires_in * 1000);

    await User.findByIdAndUpdate(userId, {
        spotifyAccessToken: access_token,
        spotifyTokenExpiry: expiry,
    });

    return access_token;
}

// ── Get a valid access token (auto-refresh if needed) ─────
async function getValidToken(userId) {
    const user = await User.findById(userId).select(
        "spotifyAccessToken spotifyRefreshToken spotifyTokenExpiry"
    );

    if (!user?.spotifyAccessToken) throw new Error("Spotify not connected");

    const isExpired = !user.spotifyTokenExpiry || new Date() >= new Date(user.spotifyTokenExpiry);
    if (isExpired) {
        return await refreshAccessToken(userId);
    }

    return user.spotifyAccessToken;
}

// ── Main: generate playlist from emotion fingerprint ──────
async function generateMoodPlaylist(userId, fingerprint, sessionDate) {
    const token = await getValidToken(userId);
    const headers = { Authorization: `Bearer ${token}` };

    const features = emotionToAudioFeatures(fingerprint);
    const seedGenres = emotionToSeedGenres(fingerprint);

    // 1. Get recommendations
    const recParams = new URLSearchParams({
        limit: 20,
        seed_genres: seedGenres,
        target_valence:      features.valence.toFixed(3),
        target_energy:       features.energy.toFixed(3),
        target_danceability: features.danceability.toFixed(3),
        target_acousticness: features.acousticness.toFixed(3),
        min_popularity: 30,
    });

    const recRes = await axios.get(`${SPOTIFY_API}/recommendations?${recParams}`, { headers });
    const trackUris = recRes.data.tracks.map(t => t.uri);

    if (trackUris.length === 0) throw new Error("No tracks found for this mood");

    // 2. Get Spotify user ID
    const profileRes = await axios.get(`${SPOTIFY_API}/me`, { headers });
    const spotifyUserId = profileRes.data.id;

    // 3. Create playlist
    const dateStr = sessionDate
        ? new Date(sessionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : new Date().toLocaleDateString();

    const playlistRes = await axios.post(
        `${SPOTIFY_API}/users/${spotifyUserId}/playlists`,
        {
            name: `Sentio Mood — ${dateStr}`,
            description: `Playlist generated by Sentio based on your emotional fingerprint. Genres: ${seedGenres.replace(",", ", ")}.`,
            public: false,
        },
        { headers: { ...headers, "Content-Type": "application/json" } }
    );

    const playlistId = playlistRes.data.id;
    const playlistUrl = playlistRes.data.external_urls.spotify;

    // 4. Add tracks to playlist
    await axios.post(
        `${SPOTIFY_API}/playlists/${playlistId}/tracks`,
        { uris: trackUris },
        { headers: { ...headers, "Content-Type": "application/json" } }
    );

    return {
        playlistUrl,
        playlistId,
        trackCount: trackUris.length,
        features,
        seedGenres,
    };
}

module.exports = { generateMoodPlaylist, getValidToken, emotionToAudioFeatures };
