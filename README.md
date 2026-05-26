# 🎭 Sentio

> *Sentio — Latin for "I feel"*

Sentio is an advanced, full-stack emotional dashboard and content recommendation engine. It transcends traditional mood tracking by employing natural language processing to generate a unique, 8-dimensional "Emotional DNA fingerprint" based on your daily inputs. 

Instead of just recording how you feel, Sentio acts on it. It curates highly personalized recommendations—movies, books, podcasts, and music—tailored specifically to your current emotional state. Whether you want to lean into your feelings, lift your mood, or seek a sharp contrast, Sentio finds the right content for you.

---

## 🚀 Live Application

Sentio is fully deployed and accessible online.

**🔗 [Access Sentio Here](https://sentio-app.vercel.app/)**

---

## ✨ Key Features

- **🧠 AI Emotion Fingerprinting:** Capture your mood through free-text journaling, curated emotion cards, and situational context. The custom Python-based ML service analyzes your text to generate a precise 8-dimensional emotion fingerprint (joy, sadness, anger, fear, surprise, nostalgia, curiosity, calm).
- **🎬 Mood-Based Recommendations:** Receive intelligent content suggestions designed to either *lean into* your current emotion, *lift* your mood, or provide an emotional *contrast*.
- **📊 Personal Emotional Dashboard:** A rich, gamified profile page featuring a Radar Chart of your emotional DNA, a Github-style 12-week activity heatmap, and a taste profile built from your rating history.
- **📅 Monthly Mood Reports:** Generate beautiful, printable 30-day lookback reports with trend lines, session statistics, and custom-generated insights using native browser PDF generation.
- **🤝 Watch Together (Group Moods):** Invite friends to a real-time "room" via a 6-digit code. Sentio aggregates everyone's emotional fingerprints to recommend content that satisfies the entire group—no more arguing over what to watch.
- **🔥 Gamification:** Build journaling streaks and earn unique badges for milestones like "Night Owl" or "Emotional Depth."

---

## 🏗️ Technical Architecture

An explanation of the core architecture of the Sentio workspace:

```text
Sentio/
├── client/                 # Frontend React Application
│   ├── public/             # Static assets
│   └── src/
│       ├── components/     # Reusable UI components (Navbar, NotificationBell, etc.)
│       ├── context/        # React Context providers (AuthContext, DialogContext)
│       ├── pages/          # Full page views (Profile, Report, MoodCapture, etc.)
│       ├── utils/          # API helpers and utility functions
│       └── index.css       # Global design system and CSS tokens
│
├── server/                 # Backend Node.js / Express API
│   ├── middleware/         # Custom Express middleware (e.g., JWT Auth)
│   ├── models/             # Mongoose schemas (User, MoodSession, Content, etc.)
│   ├── routes/             # API endpoints (auth, mood, profile, report, recommend)
│   └── utils/              # Backend utilities (Gamification logic)
│
└── ml/                     # Python Machine Learning Service
    ├── app.py              # Flask server handling NLP inference
    └── requirements.txt    # Python dependencies
```

---

## 🛠️ Technology Stack

### Frontend
- **React.js** (Create React App / Vite)
- **React Router v7** for seamless client-side navigation
- **Recharts** for beautiful data visualization (Radar and Line charts)
- **Vanilla CSS** with a robust custom design system (no external component libraries)

### Backend
- **Node.js & Express**
- **MongoDB & Mongoose** for complex data aggregation pipelines
- **JSON Web Tokens (JWT)** for secure, stateless authentication

### Machine Learning
- **Python & Flask**
- **HuggingFace Transformers** (NLP text classification)

---

## 📜 License
This project is for educational and portfolio purposes. All rights reserved.
