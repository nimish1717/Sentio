// ============================================================
// SpotifyMoodButton — opens a Spotify search for mood-matched music
// No OAuth, no Premium required — just a smart deep link
// ============================================================

const EMOTION_QUERIES = {
    joy:       { q: "happy upbeat feel-good",        genres: ["pop", "happy", "dance pop"] },
    sadness:   { q: "sad emotional heartbreak",      genres: ["sad indie", "acoustic sad", "melancholic"] },
    anger:     { q: "intense powerful aggressive",   genres: ["rock", "metal", "punk energy"] },
    fear:      { q: "dark mysterious tense",         genres: ["dark ambient", "thriller", "cinematic dark"] },
    surprise:  { q: "exciting unexpected upbeat",    genres: ["indie pop", "alternative", "electropop"] },
    nostalgia: { q: "nostalgic retro classic",       genres: ["classic rock", "soul oldies", "70s 80s"] },
    curiosity: { q: "curious experimental chill",    genres: ["jazz", "lo-fi", "instrumental chill"] },
    calm:      { q: "calm relaxing peaceful",        genres: ["ambient", "acoustic chill", "meditation"] },
};

function buildSpotifyUrl(fingerprint) {
    if (!fingerprint) return "https://open.spotify.com";

    // Find top 2 emotions by value
    const sorted = Object.entries(fingerprint)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);

    if (sorted.length === 0) return "https://open.spotify.com";

    const [topEmotion] = sorted[0];
    const meta = EMOTION_QUERIES[topEmotion] || EMOTION_QUERIES.calm;

    // Pick a random genre from the top emotion's genre list for variety
    const genre = meta.genres[Math.floor(Math.random() * meta.genres.length)];
    const query = encodeURIComponent(genre);

    return `https://open.spotify.com/search/${query}`;
}

export default function SpotifyMoodButton({ fingerprint }) {
    if (!fingerprint) return null;

    const sorted = Object.entries(fingerprint)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]);

    const topEmotion = sorted[0]?.[0];
    const meta = EMOTION_QUERIES[topEmotion] || EMOTION_QUERIES.calm;
    const spotifyUrl = buildSpotifyUrl(fingerprint);

    const SPOTIFY_GREEN = "#1DB954";
    const SPOTIFY_DARK = "#158a3e";

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <a
                href={spotifyUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: SPOTIFY_GREEN,
                    color: "#fff",
                    border: "none",
                    borderRadius: 999,
                    padding: "0.5rem 1.1rem",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "background 0.2s",
                }}
                onMouseOver={e => e.currentTarget.style.background = SPOTIFY_DARK}
                onMouseOut={e => e.currentTarget.style.background = SPOTIFY_GREEN}
            >
                <SpotifyIcon />
                Find <span style={{ textTransform: "capitalize", margin: "0 3px" }}>{meta.q.split(" ")[0]}</span> music on Spotify →
            </a>
            <span style={{ fontSize: "0.75rem", color: "#aaa" }}>
                Opens Spotify search matched to your mood
            </span>
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
