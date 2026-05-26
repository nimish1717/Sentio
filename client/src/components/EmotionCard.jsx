const CARD_META = {
    nostalgic: { emoji: "🌅", color: "#FAEEDA", border: "#EF9F27", text: "#633806" },
    hyped: { emoji: "⚡", color: "#EEEDFE", border: "#7F77DD", text: "#3C3489" },
    empty: { emoji: "🌑", color: "#F1EFE8", border: "#888780", text: "#2C2C2A" },
    anxious: { emoji: "🌀", color: "#FCEBEB", border: "#E24B4A", text: "#501313" },
    cozy: { emoji: "🧣", color: "#FAEEDA", border: "#BA7517", text: "#412402" },
    inspired: { emoji: "✨", color: "#E6F1FB", border: "#378ADD", text: "#042C53" },
    heartbroken: { emoji: "💔", color: "#FBEAF0", border: "#D4537E", text: "#4B1528" },
    bored: { emoji: "😶", color: "#F1EFE8", border: "#B4B2A9", text: "#444441" },
    angry: { emoji: "🔥", color: "#FCEBEB", border: "#A32D2D", text: "#501313" },
    curious: { emoji: "🔭", color: "#E1F5EE", border: "#1D9E75", text: "#04342C" },
    lonely: { emoji: "🌧", color: "#E6F1FB", border: "#185FA5", text: "#042C53" },
    content: { emoji: "☀️", color: "#EAF3DE", border: "#639922", text: "#173404" },
};

export default function EmotionCard({ name, selected, onClick }) {
    const meta = CARD_META[name] || { emoji: "😐", color: "#F1EFE8", border: "#888", text: "#333" };

    return (
        <button
            onClick={onClick}
            style={{
                background: selected ? meta.color : "#fff",
                border: `2px solid ${selected ? meta.border : "#e8e8e8"}`,
                borderRadius: 12,
                padding: "0.75rem 0.5rem",
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                transform: selected ? "scale(1.04)" : "scale(1)",
                boxShadow: selected ? `0 0 0 3px ${meta.border}33` : "none",
            }}
        >
            <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{meta.emoji}</span>
            <span style={{
                fontSize: "0.78rem",
                fontWeight: 500,
                color: selected ? meta.text : "#666",
                textTransform: "capitalize",
            }}>
                {name}
            </span>
        </button>
    );
}