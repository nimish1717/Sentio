// ============================================================
// Sentio — MongoDB Models
// All 4 schemas in one file for simplicity
// ============================================================

const mongoose = require("mongoose");

// ─── Emotion fingerprint shape (reused across models) ───────
const fingerprintSchema = {
    joy: { type: Number, default: 0 },
    sadness: { type: Number, default: 0 },
    anger: { type: Number, default: 0 },
    fear: { type: Number, default: 0 },
    surprise: { type: Number, default: 0 },
    nostalgia: { type: Number, default: 0 },
    curiosity: { type: Number, default: 0 },
    calm: { type: Number, default: 0 },
};

// ─── 1. User ─────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        passwordHash: { type: String, required: true },
        totalSessions: { type: Number, default: 0 },

        // Gamification
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 },
        badges: [{ type: String }],
        lastSessionDate: { type: Date },

        // Admin flag — set manually in MongoDB Atlas
        isAdmin: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// ─── 2. MoodSession ──────────────────────────────────────────
// One document per mood capture — stores everything about that session
const moodSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // The 3 inputs
        freeText: { type: String, default: "" },
        selectedCards: [{ type: String }], // e.g. ["nostalgic", "empty"]
        contextAnswers: {
            company: { type: String, enum: ["alone", "group"], default: "alone" },
            time: { type: String, enum: ["short", "long", "any"], default: "any" },
            mode: { type: String, enum: ["lean", "lift", "contrast"], default: "lean" },
        },
        // Output from Flask
        textScores: fingerprintSchema,
        emotionFingerprint: fingerprintSchema, // final combined fingerprint

        // What was recommended this session
        recommendationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Content" }],
    },
    { timestamps: true }
);

// ─── 3. Content ──────────────────────────────────────────────
// Movies, series, books, podcasts, music — all in one collection
const contentSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        type: {
            type: String,
            enum: ["movie", "series", "book", "podcast", "music"],
            required: true,
        },
        description: { type: String, default: "" },

        // feel description — shown to user instead of genre
        // e.g. "For when you want to feel understood"
        feelDescription: { type: String, default: "" },

        language: { type: String, default: "en" },
        durationMins: { type: Number, default: 0 }, // 0 = unknown

        // Where this content came from
        source: {
            type: String,
            enum: ["tmdb", "openlibrary", "itunes", "lastfm"],
        },
        externalId: { type: String }, // ID from the source API

        // Thumbnail/cover image URL
        imageUrl: { type: String, default: "" },

        // The emotion fingerprint — computed by running description
        // through the Flask classifier during content seeding
        emotionFingerprint: fingerprintSchema,
    },
    { timestamps: true }
);

// Index for faster querying by type and language
contentSchema.index({ type: 1, language: 1 });

// ─── 4. Rating ───────────────────────────────────────────────
// Thumbs up/down on a recommendation — feeds collaborative filter
const ratingSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        contentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Content",
            required: true,
        },
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MoodSession",
        },
        rating: {
            type: Number,
            enum: [1, -1], // 1 = thumbs up, -1 = thumbs down
            required: true,
        },
    },
    { timestamps: true }
);

// ─── 5. Room (Group mood / Watch together) ───────────────────
const roomSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true }, // 6-digit code
        hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["waiting", "complete"], default: "waiting" },

        // Each member's submission
        members: [
            {
                name: { type: String },          // display name (no account needed)
                fingerprint: fingerprintSchema,
                submittedAt: { type: Date },
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            },
        ],

        // How many members host expects
        expectedCount: { type: Number, default: 2 },

        // Final group fingerprint (set when all members submit)
        groupFingerprint: fingerprintSchema,

        // Recommendations for the group
        recommendationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Content" }],

        // Rooms expire after 24 hours
        expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
    },
    { timestamps: true }
);

// Auto-delete expired rooms
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── 6. Watchlist ────────────────────────────────────────────
// Saved content with the mood session context
const watchlistSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        contentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Content",
            required: true,
        },
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MoodSession",
            // optional for search
        },
    },
    { timestamps: true }
);

// Prevent duplicate saves of the same content by the same user
watchlistSchema.index({ userId: 1, contentId: 1 }, { unique: true });

// ─── 7. Notification ─────────────────────────────────────────
// Smart alerts and gamification milestones
const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["streak-risk", "saved-unwatched", "weekly-pattern", "milestone", "weekly-insight"],
            required: true,
        },
        message: { type: String, required: true },
        read: { type: Boolean, default: false },
        
        // Context identifier to prevent duplicate notifications
        // e.g., the contentId for saved-unwatched, or date string for streak-risk
        metadata: { type: String },
    },
    { timestamps: true }
);

// ─── 8. ShareToken ─────────────────────────────────────────────
const shareTokenSchema = new mongoose.Schema(
    {
        token: { type: String, required: true, unique: true },
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MoodSession",
            required: true,
        },
        expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    },
    { timestamps: true }
);

// Auto-delete expired tokens
shareTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

module.exports = {
    User: mongoose.model("User", userSchema),
    MoodSession: mongoose.model("MoodSession", moodSessionSchema),
    Content: mongoose.model("Content", contentSchema),
    Rating: mongoose.model("Rating", ratingSchema),
    Room: mongoose.model("Room", roomSchema),
    Watchlist: mongoose.model("Watchlist", watchlistSchema),
    Notification: mongoose.model("Notification", notificationSchema),
    ShareToken: mongoose.model("ShareToken", shareTokenSchema),
};