import { createContext, useContext, useState } from "react";

const DialogContext = createContext();

export function DialogProvider({ children }) {
    const [dialogs, setDialogs] = useState([]);

    const showAlert = (message, title = "Alert") => {
        const id = Date.now() + Math.random();
        setDialogs((prev) => [...prev, { id, message, title, type: 'alert' }]);
    };

    const showConfirm = (message, title = "Confirm", onConfirm) => {
        const id = Date.now() + Math.random();
        setDialogs((prev) => [...prev, { id, message, title, type: 'confirm', onConfirm }]);
    };

    const closeDialog = (id) => {
        setDialogs((prev) => prev.filter((d) => d.id !== id));
    };

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            {/* Render active dialogs */}
            {dialogs.map((dialog) => (
                <div key={dialog.id} style={{
                    position: "fixed", 
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.4)", 
                    zIndex: 9999,
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    backdropFilter: "blur(2px)",
                    animation: "fadeIn 0.2s ease-out"
                }}>
                    <div style={{
                        background: "#fff", 
                        padding: "1.5rem 2rem", 
                        borderRadius: "16px",
                        width: "90%", 
                        maxWidth: "400px", 
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                        textAlign: "center",
                        transform: "scale(1)",
                        animation: "popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                    }}>
                        {/* Theme icon or visual touch */}
                        <div style={{ 
                            fontSize: "2rem", 
                            marginBottom: "0.5rem" 
                        }}>
                            ✨
                        </div>
                        <h3 style={{ 
                            margin: "0 0 0.5rem 0", 
                            color: "#3C3489", 
                            fontSize: "1.3rem",
                            fontWeight: 600
                        }}>
                            {dialog.title}
                        </h3>
                        <p style={{ 
                            margin: "0 0 1.5rem 0", 
                            color: "#555", 
                            lineHeight: 1.5,
                            fontSize: "0.95rem"
                        }}>
                            {dialog.message}
                        </p>
                        
                        {dialog.type === 'confirm' ? (
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button 
                                    className="btn btn-outline" 
                                    style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", fontWeight: 600 }}
                                    onClick={() => closeDialog(dialog.id)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", fontWeight: 600 }}
                                    onClick={() => {
                                        dialog.onConfirm();
                                        closeDialog(dialog.id);
                                    }}
                                >
                                    Confirm
                                </button>
                            </div>
                        ) : (
                            <button 
                                className="btn btn-primary" 
                                style={{ 
                                    width: "100%", 
                                    padding: "0.75rem",
                                    borderRadius: "8px",
                                    fontWeight: 600
                                }}
                                onClick={() => closeDialog(dialog.id)}
                            >
                                Got it
                            </button>
                        )}
                    </div>
                </div>
            ))}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </DialogContext.Provider>
    );
}

export const useDialog = () => useContext(DialogContext);
