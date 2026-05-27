// ============================================================
// Sentio — API Utility
// All axios calls go through here — never call axios directly in components
// ============================================================

import axios from "axios";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("sentio_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// If token expires, redirect to login
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem("sentio_token");
            window.location.href = "/auth";
        }
        return Promise.reject(err);
    }
);

// ─── Auth ─────────────────────────────────────
export const authAPI = {
    register: (data) => api.post("/auth/register", data),
    login: (data) => api.post("/auth/login", data),
    me: () => api.get("/auth/me"),
};

// ─── Mood ─────────────────────────────────────
export const moodAPI = {
    analyze: (data) => api.post("/mood/analyze", data),
    history: (page) => api.get(`/mood/history?page=${page || 1}`),
    insights: () => api.get("/mood/insights"),
    remove: (id) => api.delete(`/mood/${id}`),
};

// ─── Recommend ────────────────────────────────
export const recommendAPI = {
    get: (id, filters = {}) => {
        const clean = {};
        if (filters.roomId) {
            clean.roomId = filters.roomId;
        } else {
            clean.sessionId = id;
        }
        
        Object.entries(filters).forEach(([k, v]) => {
            if (k !== "roomId" && v && v !== "undefined" && v !== "all") clean[k] = v;
        });
        const params = new URLSearchParams(clean);
        return api.get(`/recommend?${params}`);
    },
};

// ─── Rating ───────────────────────────────────
export const ratingAPI = {
    rate: (data) => api.post("/rating", data),
};

// ─── Room (Group mood) ────────────────────────
export const roomAPI = {
    create: (data) => api.post("/room/create", data),
    join: (code, data) => api.post(`/room/${code}/join`, data),
    get: (code) => api.get(`/room/${code}`),
    history: () => api.get("/room/history"),
    remove: (code) => api.delete(`/room/${code}`),
    complete: (code) => api.post(`/room/${code}/complete`),
};

// ─── Watchlist ────────────────────────────────
export const watchlistAPI = {
    toggle: (data) => api.post("/watchlist/toggle", data),
    get: () => api.get("/watchlist"),
};

// ─── Search ───────────────────────────────────
export const searchAPI = {
    search: (query, type = "All") => api.get(`/search?q=${encodeURIComponent(query)}&type=${type}`),
};

// ─── Notifications ────────────────────────────
export const notificationsAPI = {
    get: () => api.get("/notifications"),
    markRead: () => api.post("/notifications/read"),
};

// ─── Share ────────────────────────────────────
export const shareAPI = {
    generateLink: (sessionId) => api.post(`/mood/share/${sessionId}`),
    getSharedSession: (token) => api.get(`/share/${token}`),
};

// ─── Profile ──────────────────────────────
export const profileAPI = {
    get: () => api.get("/profile"),
};

// ─── Report ───────────────────────────────
export const reportAPI = {
    get: () => api.get("/report"),
};

// ─── Admin ────────────────────────────────
export const adminAPI = {
    getStats: () => api.get("/admin/stats"),
    triggerCron: () => api.post("/admin/trigger-cron"),
};

// ─── Socket base URL (without /api) ───────
export const SOCKET_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000/api")
    .replace(/\/api$/, "");

export default api;