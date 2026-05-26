import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EmotionCard from "../components/EmotionCard";
import { moodAPI } from "../utils/api";

const CARDS = [
    "nostalgic", "hyped", "empty", "anxious",
    "cozy", "inspired", "heartbroken", "bored",
    "angry", "curious", "lonely", "content",
];

const STEPS = ["Write", "Feel", "Context"];

export default function MoodCapture() {
    const [step, setStep] = useState(0); // 0, 1, 2
    const [text, setText] = useState("");
    const [cards, setCards] = useState([]);
    const [context, setContext] = useState({ company: "alone", time: "any", mode: "lean" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const toggleCard = (card) =>
        setCards(prev => prev.includes(card) ? prev.filter(c => c !== card) : [...prev, card]);

    const canNext = () => {
        if (step === 0) return text.trim().length >= 5 || cards.length > 0;
        if (step === 1) return cards.length > 0;
        return true;
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await moodAPI.analyze({ text, cards, context });
            navigate(`/results/${res.data.sessionId}`);
        } catch (err) {
            setError(err.response?.data?.error || "Something went wrong. Is the server running?");
            setLoading(false);
        }
    };

    return (
        <div className="page" style={{ maxWidth: 600 }}>

            {/* Step indicator */}
            <div style={{ display: "flex", gap: 8, marginBottom: "2rem", alignItems: "center" }}>
                {STEPS.map((s, i) => (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, flex: i < 2 ? 1 : 0 }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: i <= step ? "#7F77DD" : "#e8e8e8",
                            color: i <= step ? "#fff" : "#aaa",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.8rem", fontWeight: 600, flexShrink: 0,
                        }}>{i + 1}</div>
                        <span style={{ fontSize: "0.85rem", color: i === step ? "#534AB7" : "#aaa", fontWeight: i === step ? 500 : 400 }}>
                            {s}
                        </span>
                        {i < 2 && <div style={{ flex: 1, height: 1, background: "#e8e8e8" }} />}
                    </div>
                ))}
            </div>

            {/* ── Step 0: Free text ── */}
            {step === 0 && (
                <div>
                    <h2 style={{ marginBottom: 8 }}>How are you feeling right now?</h2>
                    <p className="muted" style={{ marginBottom: "1.25rem" }}>
                        Just type freely. "Exhausted after a long week" or "strangely nostalgic tonight" — anything works.
                    </p>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="I just finished a really heavy series and feel kind of empty..."
                        rows={5}
                        style={{ resize: "vertical", lineHeight: 1.6 }}
                        autoFocus
                    />
                    <p style={{ fontSize: "0.8rem", color: "#aaa", marginTop: 6 }}>
                        {text.length}/500 characters
                    </p>
                </div>
            )}

            {/* ── Step 1: Emotion cards ── */}
            {step === 1 && (
                <div>
                    <h2 style={{ marginBottom: 8 }}>Pick all the feelings that fit</h2>
                    <p className="muted" style={{ marginBottom: "1.25rem" }}>
                        Select as many as you want — you can feel multiple things at once.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6rem" }}>
                        {CARDS.map(card => (
                            <EmotionCard
                                key={card}
                                name={card}
                                selected={cards.includes(card)}
                                onClick={() => toggleCard(card)}
                            />
                        ))}
                    </div>
                    {cards.length > 0 && (
                        <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#7F77DD", fontWeight: 500 }}>
                            Selected: {cards.join(", ")}
                        </p>
                    )}
                </div>
            )}

            {/* ── Step 2: Context questions ── */}
            {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <h2 style={{ marginBottom: 0 }}>A few quick questions</h2>
                    <p className="muted">These help us personalise your pack.</p>

                    {/* Q1 */}
                    <div className="card">
                        <p style={{ fontWeight: 500, marginBottom: "0.75rem" }}>Are you alone or with someone?</p>
                        <div style={{ display: "flex", gap: 8 }}>
                            {["alone", "group"].map(opt => (
                                <button key={opt} onClick={() => setContext(c => ({ ...c, company: opt }))}
                                    className="btn"
                                    style={{
                                        flex: 1,
                                        background: context.company === opt ? "#EEEDFE" : "#fff",
                                        border: `1.5px solid ${context.company === opt ? "#7F77DD" : "#e8e8e8"}`,
                                        color: context.company === opt ? "#3C3489" : "#666",
                                        textTransform: "capitalize",
                                    }}>
                                    {opt === "alone" ? "😌 Alone" : "👥 With people"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Q2 */}
                    <div className="card">
                        <p style={{ fontWeight: 500, marginBottom: "0.75rem" }}>How much time do you have?</p>
                        <div style={{ display: "flex", gap: 8 }}>
                            {[["short", "⚡ Under 1hr"], ["any", "🕐 A few hours"], ["long", "🌙 All night"]].map(([val, label]) => (
                                <button key={val} onClick={() => setContext(c => ({ ...c, time: val }))}
                                    className="btn"
                                    style={{
                                        flex: 1, fontSize: "0.82rem",
                                        background: context.time === val ? "#EEEDFE" : "#fff",
                                        border: `1.5px solid ${context.time === val ? "#7F77DD" : "#e8e8e8"}`,
                                        color: context.time === val ? "#3C3489" : "#666",
                                    }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Q3 */}
                    <div className="card">
                        <p style={{ fontWeight: 500, marginBottom: "0.75rem" }}>Do you want to lean into your feeling or shift it?</p>
                        <div style={{ display: "flex", gap: 8 }}>
                            {[["lean", "🌊 Lean into it"], ["lift", "☀️ Lift my mood"], ["contrast", "⚡ Something different"]].map(([val, label]) => (
                                <button key={val} onClick={() => setContext(c => ({ ...c, mode: val }))}
                                    className="btn"
                                    style={{
                                        flex: 1, fontSize: "0.78rem",
                                        background: context.mode === val ? "#EEEDFE" : "#fff",
                                        border: `1.5px solid ${context.mode === val ? "#7F77DD" : "#e8e8e8"}`,
                                        color: context.mode === val ? "#3C3489" : "#666",
                                    }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {error && <div className="msg-error" style={{ marginTop: "1rem" }}>{error}</div>}

            {/* Navigation buttons */}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem", justifyContent: "space-between" }}>
                {step > 0 ? (
                    <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>
                ) : <div />}

                {step < 2 ? (
                    <button
                        className="btn btn-primary"
                        onClick={() => setStep(s => s + 1)}
                        disabled={!canNext()}
                    >
                        Continue →
                    </button>
                ) : (
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{ minWidth: 160 }}
                    >
                        {loading ? "Finding your pack..." : "🎯 Get my recommendations"}
                    </button>
                )}
            </div>
        </div>
    );
}