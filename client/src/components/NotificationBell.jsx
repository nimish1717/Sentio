import { useState, useEffect, useRef } from "react";
import { notificationsAPI } from "../utils/api";

const TYPE_ICONS = {
    "streak-risk": "🔥",
    "saved-unwatched": "📌",
    "weekly-pattern": "🧠",
    "milestone": "🏆",
    "weekly-insight": "📊",
};

function formatTimeAgo(dateString) {
    const d = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - d) / 1000);
    
    let interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "just now";
}

export default function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await notificationsAPI.get();
            setUnreadCount(res.data.unreadCount);
            setNotifications(res.data.notifications);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    // Handle outside click to close dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDropdown = async () => {
        const willOpen = !isOpen;
        setIsOpen(willOpen);
        
        if (willOpen && unreadCount > 0) {
            setUnreadCount(0); // Optimistic UI
            try {
                await notificationsAPI.markRead();
                // Notifications themselves will be marked read on next fetch
            } catch (err) {
                console.error("Failed to mark read", err);
            }
        }
    };

    return (
        <div style={{ position: "relative" }} ref={dropdownRef}>
            <button 
                onClick={toggleDropdown}
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    padding: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isOpen ? "#534AB7" : "#666",
                    transition: "color 0.2s"
                }}
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                    <span style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        background: "#E24B4A",
                        color: "white",
                        fontSize: "0.65rem",
                        fontWeight: "bold",
                        width: 16,
                        height: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%"
                    }}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    width: 320,
                    background: "white",
                    borderRadius: "12px",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                    border: "1px solid #eee",
                    zIndex: 1000,
                    marginTop: "8px",
                    overflow: "hidden"
                }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0, fontSize: "1rem", color: "#333" }}>Notifications</h3>
                    </div>
                    
                    <div style={{ maxHeight: 350, overflowY: "auto" }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: "30px 16px", textAlign: "center", color: "#888", fontSize: "0.9rem" }}>
                                You're all caught up!
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div key={notif._id} style={{
                                    padding: "12px 16px",
                                    borderBottom: "1px solid #f5f5f5",
                                    display: "flex",
                                    gap: "12px",
                                    background: notif.read ? "white" : "#F8F8FF",
                                    transition: "background 0.2s"
                                }}>
                                    <div style={{ fontSize: "1.2rem", paddingTop: "2px" }}>
                                        {TYPE_ICONS[notif.type] || "🔔"}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontSize: "0.9rem", color: "#333", lineHeight: 1.4 }}>
                                            {notif.message}
                                        </p>
                                        <span style={{ fontSize: "0.75rem", color: "#888", marginTop: "4px", display: "block" }}>
                                            {formatTimeAgo(notif.createdAt)}
                                        </span>
                                    </div>
                                    {!notif.read && (
                                        <div style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            background: "#534AB7",
                                            marginTop: "6px",
                                            flexShrink: 0
                                        }} />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
