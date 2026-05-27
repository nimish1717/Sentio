import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io as socketIO } from "socket.io-client";
import EmotionCard from "../components/EmotionCard";
import { roomAPI, moodAPI, SOCKET_URL } from "../utils/api";
import { useDialog } from "../context/DialogContext";

const CARDS = ["nostalgic", "hyped", "empty", "anxious", "cozy", "inspired", "heartbroken", "bored", "angry", "curious", "lonely", "content"];

export default function WatchTogether() {
    const [view, setView] = useState("home");   // home | create | join | waiting | done
    const [room, setRoom] = useState(null);
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [expectedCount, setExpectedCount] = useState(2);
    const [text, setText] = useState("");
    const [cards, setCards] = useState([]);
    const context = { company: "group", time: "any", mode: "lean" };
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    
    // For Home view room list
    const [liveRooms, setLiveRooms] = useState([]);
    const [historyRooms, setHistoryRooms] = useState([]);
    const [myUserId, setMyUserId] = useState(null);

    const pollRef = useRef(null);
    const socketRef = useRef(null);
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useDialog();

    // Fetch room history when on home view
    useEffect(() => {
        if (view === "home") {
            fetchRooms();
        }
    }, [view]);

    const fetchRooms = async () => {
        try {
            const res = await roomAPI.history();
            const allRooms = res.data.rooms || [];
            setMyUserId(res.data.userId);
            setLiveRooms(allRooms.filter(r => r.status === "waiting"));
            setHistoryRooms(allRooms.filter(r => r.status === "complete"));
        } catch (e) {
            console.error("Failed to fetch rooms", e);
        }
    };

    // Real-time room updates via Socket.io
    // Replaces the old 3-second polling setInterval
    useEffect(() => {
        if (view === "waiting" && room?.code) {
            // Connect socket and join the room channel
            const socket = socketIO(SOCKET_URL, { transports: ["websocket", "polling"] });
            socketRef.current = socket;

            socket.on("connect", () => {
                socket.emit("join-room", room.code);
            });

            socket.on("room-updated", ({ room: updatedRoom }) => {
                setRoom(updatedRoom);
            });

            socket.on("room-complete", ({ room: updatedRoom }) => {
                setRoom(updatedRoom);
                setView("done");
            });

            return () => {
                socket.emit("leave-room", room.code);
                socket.disconnect();
                socketRef.current = null;
            };
        }
    }, [view, room?.code]);

    const handleCreate = async () => {
        setLoading(true); setError("");
        try {
            const res = await roomAPI.create({ hostName: name || "Host", expectedCount });
            setRoom(res.data.room);
            setView("join"); // host also needs to submit mood
        } catch (e) { setError("Could not create room"); }
        finally { setLoading(false); }
    };

    const handleJoinRoom = async () => {
        setLoading(true); setError("");
        try {
            const res = await roomAPI.get(code.toUpperCase());
            setRoom(res.data.room);
            setView("join");
        } catch (e) { setError("Room not found"); }
        finally { setLoading(false); }
    };

    const handleSubmitMood = async () => {
        if (!name.trim()) { setError("Enter your name"); return; }
        setLoading(true); setError("");
        try {
            // Get fingerprint from mood API
            const moodRes = await moodAPI.analyze({ text, cards, context });
            const fingerprint = moodRes.data.fingerprint;

            // Join room with fingerprint
            const res = await roomAPI.join(room.code, { name, fingerprint });
            setRoom(res.data.room);
            setView(res.data.room.status === "complete" ? "done" : "waiting");
        } catch (e) {
            setError(e.response?.data?.error || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleEndEarly = async () => {
        showConfirm("End the session now without waiting for others?", "End Session", async () => {
            setLoading(true);
            try {
                const res = await roomAPI.complete(room.code);
                setRoom(res.data.room);
                setView("done");
            } catch (e) {
                showAlert(e.response?.data?.error || "Could not end session", "Error");
            } finally {
                setLoading(false);
            }
        });
    };

    const handleDeleteRoom = async (roomCode) => {
        showConfirm("Delete this room?", "Delete Room", async () => {
            try {
                await roomAPI.remove(roomCode);
                fetchRooms(); // Refresh lists
            } catch (e) {
                showAlert("Failed to delete room. Are you the host?", "Error");
            }
        });
    };

    const toggleCard = (card) =>
        setCards(prev => prev.includes(card) ? prev.filter(c => c !== card) : [...prev, card]);

    // ── Home ──
    if (view === "home") return (
        <div className="page" style={{ maxWidth: 600, margin: "0 auto", paddingTop: "2rem" }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>👥</div>
                <h2 style={{ marginBottom: 8 }}>Watch Together</h2>
                <p className="muted" style={{ marginBottom: "2rem" }}>Everyone submits their mood. Sentio finds what works for the whole group.</p>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                    <button className="btn btn-primary" onClick={() => setView("create")}>Create a room</button>
                    <button className="btn btn-outline" onClick={() => setView("enter-code")}>Join with code</button>
                </div>
            </div>

            {/* Live Rooms */}
            {liveRooms.length > 0 && (
                <div style={{ marginBottom: "2rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "#444" }}>Live Rooms</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {liveRooms.map(r => (
                            <div key={r._id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: "#3C3489", fontSize: "1.1rem" }}>{r.code}</div>
                                    <div style={{ fontSize: "0.85rem", color: "#666", marginTop: 4 }}>
                                        {r.members?.length || 0} / {r.expectedCount} members joined
                                        <div style={{ marginTop: 2 }}>
                                            {r.members?.map(m => m.name).join(", ")}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <button className="btn btn-outline" onClick={() => { setCode(r.code); handleJoinRoom(); }} style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                                        Rejoin
                                    </button>
                                    {r.hostId === myUserId && (
                                        <button className="btn btn-ghost" onClick={() => handleDeleteRoom(r.code)} style={{ padding: "0.4rem 0.8rem", color: "#E24B4A" }}>
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Room History */}
            {historyRooms.length > 0 && (
                <div>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "#444" }}>Room History</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {historyRooms.map(r => (
                            <div key={r._id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fdfdfd" }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: "#555" }}>Room {r.code}</div>
                                    <div style={{ fontSize: "0.85rem", color: "#888", marginTop: 4 }}>
                                        {new Date(r.createdAt).toLocaleDateString()} · {r.members?.length} members: {r.members?.map(m => m.name).join(", ")}
                                    </div>
                                </div>
                                {r.hostId === myUserId && (
                                    <button onClick={() => handleDeleteRoom(r.code)} style={{ background: "none", border: "none", color: "#E24B4A", cursor: "pointer", fontSize: "1.1rem", opacity: 0.7 }}>
                                        🗑
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // ── Enter code to join ──
    if (view === "enter-code") return (
        <div className="page" style={{ maxWidth: 400 }}>
            <h2 style={{ marginBottom: "1.5rem" }}>Join a room</h2>
            <div className="card">
                <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 6 }}>Room code</label>
                <input type="text" placeholder="e.g. AB3F9K" value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    style={{ textTransform: "uppercase", letterSpacing: "0.15em", fontSize: "1.1rem", textAlign: "center" }}
                    maxLength={6} />
                {error && <div className="msg-error" style={{ marginTop: 8 }}>{error}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
                    <button className="btn btn-ghost" onClick={() => setView("home")} style={{ flex: 1 }}>Back</button>
                    <button className="btn btn-primary" onClick={handleJoinRoom} disabled={code.length < 6 || loading} style={{ flex: 2 }}>
                        {loading ? "Joining..." : "Join Room →"}
                    </button>
                </div>
            </div>
        </div>
    );

    // ── Create room ──
    if (view === "create") return (
        <div className="page" style={{ maxWidth: 400 }}>
            <h2 style={{ marginBottom: "1.5rem" }}>Create a room</h2>
            <div className="card">
                <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 6 }}>Your name</label>
                <input type="text" placeholder="e.g. Arjun" value={name} onChange={e => setName(e.target.value)} />
                
                <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", margin: "1rem 0 6px" }}>
                    How many people? (including you)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                    {[2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setExpectedCount(n)}
                            style={{
                                flex: 1, padding: "0.5rem", borderRadius: 8, cursor: "pointer",
                                border: `1.5px solid ${expectedCount === n ? "#7F77DD" : "#e8e8e8"}`,
                                background: expectedCount === n ? "#EEEDFE" : "#fff",
                                color: expectedCount === n ? "#3C3489" : "#666",
                                fontWeight: 500,
                            }}>
                            {n}
                        </button>
                    ))}
                </div>

                {error && <div className="msg-error" style={{ marginTop: 8 }}>{error}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
                    <button className="btn btn-ghost" onClick={() => setView("home")} style={{ flex: 1 }}>Back</button>
                    <button className="btn btn-primary" onClick={handleCreate} disabled={loading} style={{ flex: 2 }}>
                        {loading ? "Creating..." : "Create Room →"}
                    </button>
                </div>
            </div>
        </div>
    );

    // ── Submit mood ──
    if (view === "join") return (
        <div className="page" style={{ maxWidth: 560 }}>
            <div className="card" style={{ background: "#EEEDFE", border: "none", marginBottom: "1.25rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.85rem", color: "#888", marginBottom: 4 }}>Room code</div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "#534AB7", letterSpacing: "0.15em" }}>{room?.code}</div>
                <div style={{ fontSize: "0.8rem", color: "#888", marginTop: 4 }}>Share this with your friends</div>
            </div>

            <h3 style={{ marginBottom: "1rem" }}>How are you feeling right now?</h3>

            {/* Name */}
            <div style={{ marginBottom: "1rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 5 }}>Your name</label>
                <input type="text" placeholder="e.g. Priya" value={name} onChange={e => setName(e.target.value)} />
            </div>

            {/* Free text */}
            <div style={{ marginBottom: "1rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 5 }}>How do you feel? (optional)</label>
                <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="Tired but in the mood for something fun..." />
            </div>

            {/* Cards */}
            <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, display: "block", marginBottom: 8 }}>Pick your feelings</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {CARDS.map(card => (
                        <EmotionCard key={card} name={card} selected={cards.includes(card)} onClick={() => toggleCard(card)} />
                    ))}
                </div>
            </div>

            {error && <div className="msg-error" style={{ marginBottom: "1rem" }}>{error}</div>}

            <button className="btn btn-primary btn-full btn-large" onClick={handleSubmitMood} disabled={loading || cards.length === 0}>
                {loading ? "Submitting..." : "Submit my mood →"}
            </button>
        </div>
    );

    // ── Waiting for others ──
    if (view === "waiting") return (
        <div className="page" style={{ maxWidth: 480, textAlign: "center", paddingTop: "3rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
            <h2 style={{ marginBottom: 8 }}>Waiting for everyone...</h2>
            <div className="card" style={{ background: "#EEEDFE", border: "none", margin: "1.5rem 0" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "#534AB7", letterSpacing: "0.15em" }}>{room?.code}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 300, margin: "0 auto" }}>
                {room?.members?.map((m, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#E1F5EE", borderRadius: 8, padding: "8px 12px" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75" }} />
                        <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#085041" }}>{m.name} submitted ✓</span>
                    </div>
                ))}
            </div>
            
            {room?.hostId === myUserId && room?.members?.length > 0 && (
                <button className="btn btn-outline" style={{ marginTop: "1.5rem", color: "#E24B4A", borderColor: "#E24B4A" }} onClick={handleEndEarly} disabled={loading}>
                    {loading ? "Ending..." : "End Session Early"}
                </button>
            )}
            
            <p className="muted" style={{ marginTop: "1.5rem", fontSize: "0.85rem" }}>Connected live ⚡ updates instantly when someone joins.</p>
        </div>
    );

    // ── Done — show group fingerprint + link to results ──
    if (view === "done") return (
        <div className="page" style={{ maxWidth: 500, textAlign: "center", paddingTop: "2rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎉</div>
            <h2 style={{ marginBottom: 8 }}>Everyone's in!</h2>
            <p className="muted" style={{ marginBottom: "1.5rem" }}>
                {room?.members?.length} people submitted their mood. Here's what the group is feeling:
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: "2rem" }}>
                {room?.groupFingerprint && Object.entries(room.groupFingerprint)
                    .sort((a, b) => b[1] - a[1]).slice(0, 4)
                    .map(([emotion, score]) => (
                        <span key={emotion} className="badge badge-purple" style={{ fontSize: "0.85rem", padding: "5px 14px", textTransform: "capitalize" }}>
                            {emotion} {Math.round(score * 100)}%
                        </span>
                    ))
                }
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button className="btn btn-outline" onClick={() => navigate("/")}>
                    ← Back home
                </button>
                <button className="btn btn-primary" onClick={() => navigate(`/results/room-${room.code}`)}>
                    See Group Recommendations →
                </button>
            </div>
        </div>
    );
}