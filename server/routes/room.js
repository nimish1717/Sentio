const router = require("express").Router();
const axios = require("axios");
const { Room } = require("../models");
const auth = require("../middleware/auth");
const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Get user's room history (live and completed rooms)
router.get("/history", auth, async (req, res) => {
    try {
        const rooms = await Room.find({
            $or: [
                { hostId: req.userId },
                { "members.userId": req.userId }
            ]
        }).sort({ createdAt: -1 });
        res.json({ rooms, userId: req.userId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/create", auth, async (req, res) => {
    try {
        const { hostName, expectedCount } = req.body;
        let code, attempts = 0;
        do { code = generateCode(); attempts++; }
        while ((await Room.findOne({ code })) && attempts < 10);

        const room = await Room.create({
            code, 
            hostName: hostName || "Host", 
            hostId: req.userId,
            expectedCount: expectedCount || 2, 
            members: [],
        });
        res.status(201).json({ room });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/:code/join", auth, async (req, res) => {
    try {
        const { name, fingerprint } = req.body;
        const room = await Room.findOne({ code: req.params.code.toUpperCase() });
        if (!room) return res.status(404).json({ error: "Room not found" });
        if (room.status === "complete")
            return res.status(400).json({ error: "Room already complete" });

        // Prevent duplicate joins
        if (room.members.some(m => m.userId && m.userId.toString() === req.userId)) {
            // Already joined, just return the room
            return res.json({ room });
        }

        room.members.push({ 
            name: name || "Guest", 
            fingerprint, 
            submittedAt: new Date(), 
            userId: req.userId 
        });

        if (room.members.length >= room.expectedCount) {
            const mlRes = await axios.post(`${ML_URL}/group-fingerprint`, {
                fingerprints: room.members.map(m => m.fingerprint),
            });
            room.groupFingerprint = mlRes.data.group_fingerprint;
            room.status = "complete";
        }
        await room.save();
        res.json({ room });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// End a room early (only host)
router.post("/:code/complete", auth, async (req, res) => {
    try {
        const room = await Room.findOne({ code: req.params.code.toUpperCase() });
        if (!room) return res.status(404).json({ error: "Room not found" });
        
        if (room.hostId && room.hostId.toString() !== req.userId) {
            return res.status(403).json({ error: "Only the host can end this room" });
        }

        if (room.status === "complete") {
            return res.json({ room });
        }

        if (room.members.length === 0) {
            return res.status(400).json({ error: "Cannot end a room with no members" });
        }

        const mlRes = await axios.post(`${ML_URL}/group-fingerprint`, {
            fingerprints: room.members.map(m => m.fingerprint),
        });
        
        room.groupFingerprint = mlRes.data.group_fingerprint;
        room.status = "complete";
        await room.save();
        
        res.json({ room });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete("/:code", auth, async (req, res) => {
    try {
        const room = await Room.findOne({ code: req.params.code.toUpperCase() });
        if (!room) return res.status(404).json({ error: "Room not found" });
        
        // Ensure user is host
        if (room.hostId && room.hostId.toString() !== req.userId) {
            return res.status(403).json({ error: "Only the host can delete this room" });
        }
        
        await Room.deleteOne({ _id: room._id });
        res.json({ message: "Room deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/:code", auth, async (req, res) => {
    try {
        const room = await Room.findOne({ code: req.params.code.toUpperCase() });
        if (!room) return res.status(404).json({ error: "Room not found" });
        res.json({ room });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;