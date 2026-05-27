// ============================================================
// Sentio — Socket.io setup
// Exported so routes can emit events without circular imports
// ============================================================

const { Server } = require("socket.io");

let io;

function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: function (origin, callback) {
                if (!origin || origin.includes("localhost") || origin.includes("vercel.app")) {
                    callback(null, true);
                } else {
                    callback(null, process.env.CLIENT_URL || true);
                }
            },
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log("🔌 Socket connected:", socket.id);

        // Client joins a room channel so it receives room-specific events
        socket.on("join-room", (roomCode) => {
            if (roomCode) {
                socket.join(roomCode.toUpperCase());
                console.log(`   Socket ${socket.id} joined room channel: ${roomCode}`);
            }
        });

        socket.on("leave-room", (roomCode) => {
            if (roomCode) socket.leave(roomCode.toUpperCase());
        });

        socket.on("disconnect", () => {
            console.log("🔌 Socket disconnected:", socket.id);
        });
    });

    return io;
}

function getIo() {
    if (!io) throw new Error("Socket.io not initialised — call initSocket(httpServer) first");
    return io;
}

module.exports = { initSocket, getIo };
