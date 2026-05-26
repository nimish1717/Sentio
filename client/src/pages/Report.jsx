import { useState, useEffect } from "react";
import { reportAPI } from "../utils/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./Report.css";

const colors = {
    joy: "#FFD700",
    sadness: "#1E90FF",
    anger: "#FF4500",
    fear: "#8A2BE2",
    surprise: "#FF1493",
    nostalgia: "#D2691E",
    curiosity: "#32CD32",
    calm: "#20B2AA"
};

export default function Report() {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await reportAPI.get();
                setReportData(res.data);
            } catch (err) {
                console.error("Error fetching report:", err);
                setError("Failed to load report data.");
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="loading-screen">Generating your report...</div>;
    if (error) return <div className="page"><div className="msg-error">{error}</div></div>;
    if (!reportData) return <div className="page">No report data available.</div>;

    const { user, stats, chartData, insight } = reportData;

    // Format X-axis dates
    const formatXAxis = (tickItem) => {
        const d = new Date(tickItem);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return (
        <div className="page-wide report-page">
            <div className="report-header">
                <div>
                    <div className="report-badge">Monthly Report</div>
                    <h1>Your Emotional Journey</h1>
                    <p className="muted">Prepared for {user.name} • Last 30 Days</p>
                </div>
                <button className="btn btn-primary print-btn" onClick={handlePrint}>
                    Print / Save PDF
                </button>
            </div>

            <div className="report-insight-card">
                <h3>Monthly Insight</h3>
                <p>{insight}</p>
            </div>

            <div className="report-stats-grid">
                <div className="report-stat">
                    <div className="stat-value">{stats.totalSessions}</div>
                    <div className="stat-label">Total Sessions</div>
                </div>
                <div className="report-stat">
                    <div className="stat-value">{stats.uniqueEmotionsCount}</div>
                    <div className="stat-label">Unique Emotions</div>
                </div>
                <div className="report-stat">
                    <div className="stat-value">🔥 {stats.longestStreak}</div>
                    <div className="stat-label">Longest Streak</div>
                </div>
                <div className="report-stat">
                    <div className="stat-value top-content-text">{stats.topContent}</div>
                    <div className="stat-label">Top Content</div>
                </div>
            </div>

            <div className="report-chart-container">
                <h3>Emotion Trends</h3>
                <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e8e8" />
                            <XAxis 
                                dataKey="date" 
                                tickFormatter={formatXAxis} 
                                minTickGap={30}
                                tick={{ fill: "#666", fontSize: 12 }} 
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis 
                                domain={[0, 1]} 
                                tick={{ fill: "#666", fontSize: 12 }} 
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip 
                                labelFormatter={(label) => new Date(label).toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' })}
                                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                            />
                            <Legend wrapperStyle={{ paddingTop: "20px" }} />
                            {Object.keys(colors).map(emotion => (
                                <Line 
                                    key={emotion}
                                    type="monotone" 
                                    dataKey={emotion} 
                                    stroke={colors[emotion]} 
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 6 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="report-footer">
                <p>Sentio — Your Personal Emotional Dashboard</p>
                <p>{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            </div>
        </div>
    );
}
