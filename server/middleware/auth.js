// ============================================================
// Sentio — JWT Auth Middleware
// Attach to any route that needs a logged-in user
// ============================================================

const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ error: "No token provided" });

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userName = decoded.name;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};