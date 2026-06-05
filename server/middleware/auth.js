// ============================================================
// Sentio — JWT Auth Middleware
// Attach to any route that needs a logged-in user
// Accepts token via: Authorization header OR ?_token= query param
// (query param only used for Spotify OAuth browser redirect)
// ============================================================

const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    // Primary: Authorization header
    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    // Fallback: ?_token query param (for Spotify OAuth redirect only)
    if (!token && req.query._token) {
        token = req.query._token;
    }

    if (!token)
        return res.status(401).json({ error: "No token provided" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userName = decoded.name;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};