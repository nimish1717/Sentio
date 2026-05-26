// ============================================================
// Sentio — Content Seeder
// Pulls real content from free APIs + tags with emotion fingerprints
// Run once: node seed.js
// ============================================================

const axios    = require("axios");
const mongoose = require("mongoose");
const dotenv   = require("dotenv");

dotenv.config();

// ─── Mongoose schema inline (no import needed) ───────────────
const fingerprintSchema = {
  joy:       { type: Number, default: 0 },
  sadness:   { type: Number, default: 0 },
  anger:     { type: Number, default: 0 },
  fear:      { type: Number, default: 0 },
  surprise:  { type: Number, default: 0 },
  nostalgia: { type: Number, default: 0 },
  curiosity: { type: Number, default: 0 },
  calm:      { type: Number, default: 0 },
};

const contentSchema = new mongoose.Schema({
  title:              { type: String, required: true },
  type:               { type: String, enum: ["movie","series","book","podcast","music"] },
  description:        { type: String, default: "" },
  feelDescription:    { type: String, default: "" },
  language:           { type: String, default: "en" },
  durationMins:       { type: Number, default: 0 },
  source:             { type: String },
  externalId:         { type: String },
  imageUrl:           { type: String, default: "" },
  emotionFingerprint: fingerprintSchema,
}, { timestamps: true });

const Content = mongoose.model("Content", contentSchema);

const ML_URL   = process.env.ML_SERVICE_URL || "http://localhost:8000";
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_URL = "https://api.themoviedb.org/3";

// ─── Helper: get emotion fingerprint from Flask ───────────────
async function getFingerprint(text) {
  try {
    const res = await axios.post(`${ML_URL}/classify`, { text });
    return res.data.scores;
  } catch (e) {
    console.error("  Flask error:", e.message);
    return { joy:0.1, sadness:0.1, anger:0.1, fear:0.1, surprise:0.1, nostalgia:0.1, curiosity:0.1, calm:0.3 };
  }
}

// ─── Helper: feel description from top emotion ────────────────
const FEEL_MAP = {
  joy:       "For when you want to laugh and feel alive",
  sadness:   "For when you want to feel understood and not alone",
  anger:     "For when you need to feel something raw and real",
  fear:      "For when you're in the mood for tension and suspense",
  surprise:  "For when you want your mind completely blown",
  nostalgia: "For when you miss the way things used to be",
  curiosity: "For when you want to learn something that changes how you see the world",
  calm:      "For when you need something quiet and unhurried",
};

function getFeelDescription(fingerprint) {
  const top = Object.entries(fingerprint).sort((a, b) => b[1] - a[1])[0][0];
  return FEEL_MAP[top] || "A great pick for tonight";
}

// ─── Delay helper to avoid rate limits ───────────────────────
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// ─── TMDB: fetch movies ───────────────────────────────────────
async function fetchMovies() {
  console.log("\n🎬 Fetching movies from TMDB...");
  const movies = [];

  // Multiple pages + genres for variety
  const requests = [
    { url: `${TMDB_URL}/movie/popular`,     params: { language: "en-US", page: 1 } },
    { url: `${TMDB_URL}/movie/popular`,     params: { language: "en-US", page: 2 } },
    { url: `${TMDB_URL}/movie/top_rated`,   params: { language: "en-US", page: 1 } },
    { url: `${TMDB_URL}/movie/top_rated`,   params: { language: "en-US", page: 2 } },
    // Hindi movies
    { url: `${TMDB_URL}/discover/movie`,    params: { with_original_language: "hi", sort_by: "popularity.desc", page: 1 } },
    { url: `${TMDB_URL}/discover/movie`,    params: { with_original_language: "hi", sort_by: "vote_average.desc", vote_count_gte: 100, page: 1 } },
    // By mood-relevant genres
    // 35=Comedy, 18=Drama, 27=Horror, 878=Sci-Fi, 10749=Romance, 99=Documentary
    { url: `${TMDB_URL}/discover/movie`, params: { with_genres: "35", sort_by: "popularity.desc", page: 1 } },
    { url: `${TMDB_URL}/discover/movie`, params: { with_genres: "18", sort_by: "popularity.desc", page: 1 } },
    { url: `${TMDB_URL}/discover/movie`, params: { with_genres: "27", sort_by: "popularity.desc", page: 1 } },
    { url: `${TMDB_URL}/discover/movie`, params: { with_genres: "878", sort_by: "popularity.desc", page: 1 } },
    { url: `${TMDB_URL}/discover/movie`, params: { with_genres: "10749", sort_by: "popularity.desc", page: 1 } },
  ];

  for (const req of requests) {
    try {
      const res = await axios.get(req.url, {
        params: { api_key: TMDB_KEY, ...req.params },
      });
      movies.push(...res.data.results);
      await delay(250);
    } catch (e) {
      console.error("  TMDB error:", e.message);
    }
  }

  // Deduplicate by id
  const seen = new Set();
  return movies.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

// ─── TMDB: fetch series ───────────────────────────────────────
async function fetchSeries() {
  console.log("\n📺 Fetching series from TMDB...");
  const series = [];

  const requests = [
    { url: `${TMDB_URL}/tv/popular`,   params: { language: "en-US", page: 1 } },
    { url: `${TMDB_URL}/tv/popular`,   params: { language: "en-US", page: 2 } },
    { url: `${TMDB_URL}/tv/top_rated`, params: { language: "en-US", page: 1 } },
    { url: `${TMDB_URL}/discover/tv`,  params: { with_original_language: "hi", sort_by: "popularity.desc", page: 1 } },
  ];

  for (const req of requests) {
    try {
      const res = await axios.get(req.url, {
        params: { api_key: TMDB_KEY, ...req.params },
      });
      series.push(...res.data.results);
      await delay(250);
    } catch (e) {
      console.error("  TMDB series error:", e.message);
    }
  }

  const seen = new Set();
  return series.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

// ─── Open Library: fetch books ────────────────────────────────
async function fetchBooks() {
  console.log("\n📖 Fetching books from Open Library...");
  const books = [];

  // Search by mood-relevant topics
  const topics = [
    "self-discovery", "nostalgia", "adventure", "mystery",
    "philosophy", "love", "thriller", "coming-of-age",
    "science fiction", "biography", "humor", "mindfulness",
    "horror", "fantasy", "history", "psychology",
  ];

  for (const topic of topics) {
    try {
      const res = await axios.get("https://openlibrary.org/search.json", {
        params: { q: topic, limit: 8, fields: "key,title,author_name,first_sentence,subject,cover_i,number_of_pages_median" },
      });
      const filtered = (res.data.docs || []).filter(b => b.title && b.first_sentence);
      books.push(...filtered.map(b => ({ ...b, topic })));
      await delay(300);
    } catch (e) {
      console.error(`  OL error (${topic}):`, e.message);
    }
  }

  // Deduplicate by key
  const seen = new Set();
  return books.filter(b => {
    if (seen.has(b.key)) return false;
    seen.add(b.key);
    return true;
  });
}

// ─── iTunes: fetch podcasts ───────────────────────────────────
async function fetchPodcasts() {
  console.log("\n🎙 Fetching podcasts from iTunes...");
  const podcasts = [];

  const terms = [
    "mindfulness meditation", "true crime", "science curiosity",
    "history stories", "comedy humor", "personal growth",
    "storytelling", "technology future", "philosophy life",
    "mental health", "motivation", "culture society",
  ];

  for (const term of terms) {
    try {
      const res = await axios.get("https://itunes.apple.com/search", {
        params: { term, media: "podcast", limit: 6, entity: "podcast" },
      });
      podcasts.push(...(res.data.results || []));
      await delay(300);
    } catch (e) {
      console.error(`  iTunes error (${term}):`, e.message);
    }
  }

  const seen = new Set();
  return podcasts.filter(p => {
    if (seen.has(p.collectionId)) return false;
    seen.add(p.collectionId);
    return p.collectionName && p.description;
  });
}

// ─── Save movie to MongoDB ────────────────────────────────────
async function saveMovie(movie) {
  const title    = movie.title;
  const desc     = movie.overview || "";
  if (!title || !desc) return;

  const existing = await Content.findOne({ externalId: String(movie.id), type: "movie" });
  if (existing) return;

  const fingerprint    = await getFingerprint(desc);
  const feelDesc       = getFeelDescription(fingerprint);
  const lang           = movie.original_language || "en";
  const duration       = movie.runtime || 0;
  const imageUrl       = movie.poster_path
    ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : "";

  await Content.create({
    title, type: "movie", description: desc,
    feelDescription: feelDesc,
    language: lang, durationMins: duration,
    source: "tmdb", externalId: String(movie.id),
    imageUrl, emotionFingerprint: fingerprint,
  });
  process.stdout.write(".");
}

// ─── Save series to MongoDB ───────────────────────────────────
async function saveSeries(show) {
  const title = show.name;
  const desc  = show.overview || "";
  if (!title || !desc) return;

  const existing = await Content.findOne({ externalId: String(show.id), type: "series" });
  if (existing) return;

  const fingerprint = await getFingerprint(desc);
  const feelDesc    = getFeelDescription(fingerprint);
  const lang        = show.original_language || "en";
  const imageUrl    = show.poster_path
    ? `https://image.tmdb.org/t/p/w300${show.poster_path}` : "";

  await Content.create({
    title, type: "series", description: desc,
    feelDescription: feelDesc,
    language: lang, durationMins: 0,
    source: "tmdb", externalId: String(show.id),
    imageUrl, emotionFingerprint: fingerprint,
  });
  process.stdout.write(".");
}

// ─── Save book to MongoDB ─────────────────────────────────────
async function saveBook(book) {
  const title = book.title;
  const desc  = Array.isArray(book.first_sentence)
    ? book.first_sentence[0] : (book.first_sentence?.value || "");
  if (!title || !desc) return;

  const existing = await Content.findOne({ externalId: book.key, type: "book" });
  if (existing) return;

  const fingerprint = await getFingerprint(desc);
  const feelDesc    = getFeelDescription(fingerprint);
  const pages       = book.number_of_pages_median || 0;
  const imageUrl    = book.cover_i
    ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : "";

  await Content.create({
    title, type: "book", description: desc,
    feelDescription: feelDesc,
    language: "en", durationMins: pages, // pages stored in durationMins for books
    source: "openlibrary", externalId: book.key,
    imageUrl, emotionFingerprint: fingerprint,
  });
  process.stdout.write(".");
}

// ─── Save podcast to MongoDB ──────────────────────────────────
async function savePodcast(podcast) {
  const title = podcast.collectionName;
  const desc  = podcast.description || podcast.artistName || "";
  if (!title || !desc) return;

  const existing = await Content.findOne({ externalId: String(podcast.collectionId), type: "podcast" });
  if (existing) return;

  const fingerprint = await getFingerprint(desc);
  const feelDesc    = getFeelDescription(fingerprint);
  const imageUrl    = podcast.artworkUrl100 || podcast.artworkUrl60 || "";

  await Content.create({
    title, type: "podcast", description: desc,
    feelDescription: feelDesc,
    language: "en", durationMins: 0,
    source: "itunes", externalId: String(podcast.collectionId),
    imageUrl, emotionFingerprint: fingerprint,
  });
  process.stdout.write(".");
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected");

  // Check Flask is running
  try {
    await axios.get(`${ML_URL}/health`);
    console.log("✅ Flask ML service is running");
  } catch (e) {
    console.error("❌ Flask not running on port 8000. Start it first: python app.py");
    process.exit(1);
  }

  const before = await Content.countDocuments();
  console.log(`\n📊 Content in DB before seeding: ${before}`);

  // ── Movies ──
  const movies = await fetchMovies();
  console.log(`\n  Found ${movies.length} movies. Tagging and saving...`);
  for (const movie of movies) {
    await saveMovie(movie);
    await delay(100); // respect Flask rate
  }

  // ── Series ──
  const series = await fetchSeries();
  console.log(`\n\n  Found ${series.length} series. Tagging and saving...`);
  for (const show of series) {
    await saveSeries(show);
    await delay(100);
  }

  // ── Books ──
  const books = await fetchBooks();
  console.log(`\n\n  Found ${books.length} books. Tagging and saving...`);
  for (const book of books) {
    await saveBook(book);
    await delay(100);
  }

  // ── Podcasts ──
  const podcasts = await fetchPodcasts();
  console.log(`\n\n  Found ${podcasts.length} podcasts. Tagging and saving...`);
  for (const podcast of podcasts) {
    await savePodcast(podcast);
    await delay(100);
  }

  const after = await Content.countDocuments();
  console.log(`\n\n✅ Done! Content in DB: ${before} → ${after} (+${after - before} items)`);
  console.log("🎉 Your recommendation engine now has real content!");
  mongoose.disconnect();
}

main().catch(err => {
  console.error("❌ Seeder failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
