import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DialogProvider } from "./context/DialogContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import MoodCapture from "./pages/MoodCapture";
import Results from "./pages/Results";
import History from "./pages/History";
import Watchlist from "./pages/Watchlist";
import WatchTogether from "./pages/WatchTogether";
import Search from "./pages/Search";
import Profile from "./pages/Profile";
import Report from "./pages/Report";

// Protect routes that need login
function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-screen">Loading...</div>;
    return user ? children : <Navigate to="/auth" />;
}

export default function App() {
    return (
        <DialogProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Navbar />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/mood" element={<PrivateRoute><MoodCapture /></PrivateRoute>} />
                        <Route path="/results/:sessionId" element={<PrivateRoute><Results /></PrivateRoute>} />
                        <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
                        <Route path="/watchlist" element={<PrivateRoute><Watchlist /></PrivateRoute>} />
                        <Route path="/search" element={<PrivateRoute><Search /></PrivateRoute>} />
                        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                        <Route path="/report" element={<PrivateRoute><Report /></PrivateRoute>} />
                        <Route path="/together" element={<WatchTogether />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </DialogProvider>
    );
}