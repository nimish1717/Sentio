import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // On app load — check if token exists and fetch user
    useEffect(() => {
        const token = localStorage.getItem("sentio_token");
        if (!token) { setLoading(false); return; }

        authAPI.me()
            .then(res => setUser(res.data.user))
            .catch(() => localStorage.removeItem("sentio_token"))
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const res = await authAPI.login({ email, password });
        localStorage.setItem("sentio_token", res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const register = async (name, email, password, verifiedToken) => {
        const res = await authAPI.register({ name, email, password, verifiedToken });
        localStorage.setItem("sentio_token", res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem("sentio_token");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);