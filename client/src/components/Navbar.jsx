import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => { logout(); navigate("/"); };

    const isActive = (path) =>
        location.pathname === path ? { borderBottom: "2px solid #7F77DD", paddingBottom: "2px" } : {};

    return (
        <nav style={{
            background: "#fff",
            borderBottom: "1px solid #e8e8e8",
            padding: "0 1.25rem",
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 100,
        }}>
            {/* Logo */}
            <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1.3rem" }}>🎭</span>
                <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#534AB7" }}>Sentio</span>
            </Link>

            {/* Nav links */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                {user && (
                    <>
                        <Link to="/mood" style={{ textDecoration: "none", color: "#666", fontSize: "0.9rem", ...isActive("/mood") }}>
                            Capture Mood
                        </Link>
                        <Link to="/history" style={{ textDecoration: "none", color: "#666", fontSize: "0.9rem", ...isActive("/history") }}>
                            History
                        </Link>
                        <Link to="/watchlist" style={{ textDecoration: "none", color: "#666", fontSize: "0.9rem", ...isActive("/watchlist") }}>
                            Watchlist
                        </Link>
                        <Link to="/search" style={{ textDecoration: "none", color: "#666", fontSize: "0.9rem", ...isActive("/search") }}>
                            Search
                        </Link>
                        <Link to="/together" style={{ textDecoration: "none", color: "#666", fontSize: "0.9rem", ...isActive("/together") }}>
                            Watch Together
                        </Link>
                    </>
                )}
            </div>

            {/* Auth */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {user ? (
                    <>
                        <NotificationBell />
                        <div style={{ width: "1px", height: "24px", background: "#e8e8e8", margin: "0 4px" }} />
                        <Link to="/profile" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, var(--purple), var(--teal))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "bold" }}>
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: "0.85rem", color: "#666", fontWeight: "500" }}>{user.name.split(" ")[0]}</span>
                        </Link>
                        <button onClick={handleLogout} className="btn btn-ghost" style={{ fontSize: "0.85rem", padding: "0.4rem 0.9rem" }}>
                            Logout
                        </button>
                    </>
                ) : (
                    <Link to="/auth">
                        <button className="btn btn-primary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>
                            Sign in
                        </button>
                    </Link>
                )}
            </div>
        </nav>
    );
}