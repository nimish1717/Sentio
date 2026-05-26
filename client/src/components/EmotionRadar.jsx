import {
    Radar, RadarChart, PolarGrid,
    PolarAngleAxis, ResponsiveContainer, Tooltip,
} from "recharts";

const EMOTION_LABELS = {
    joy: "Joy",
    sadness: "Sadness",
    anger: "Anger",
    fear: "Fear",
    surprise: "Surprise",
    nostalgia: "Nostalgia",
    curiosity: "Curiosity",
    calm: "Calm",
};

export default function EmotionRadar({ fingerprint, size = 300 }) {
    if (!fingerprint) return null;

    const data = Object.entries(fingerprint).map(([key, value]) => ({
        emotion: EMOTION_LABELS[key] || key,
        score: parseFloat((value * 100).toFixed(1)),
        fullMark: 100,
    }));

    return (
        <div style={{ width: "100%", height: size }}>
            <ResponsiveContainer width="100%" height={size}>
                <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="#e8e8e8" />
                    <PolarAngleAxis
                        dataKey="emotion"
                        tick={{ fontSize: 12, fill: "#666", fontWeight: 500 }}
                    />
                    <Radar
                        name="Mood"
                        dataKey="score"
                        stroke="#7F77DD"
                        fill="#7F77DD"
                        fillOpacity={0.25}
                        strokeWidth={2}
                    />
                    <Tooltip
                        formatter={(val) => [`${val}%`, "Score"]}
                        contentStyle={{
                            background: "#fff",
                            border: "1px solid #e8e8e8",
                            borderRadius: 8,
                            fontSize: 13,
                        }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}