# ============================================================
# Sentio — Flask ML API
# Serves the trained emotion classifier over HTTP
# Node.js backend calls this — it never talks to React directly
#
# Run: python app.py
# Runs on: http://localhost:8000
# ============================================================

import os
import sys
import pickle
import re
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

# ─────────────────────────────────────────────
# SETUP
# ─────────────────────────────────────────────

app = Flask(__name__)
CORS(app)  # allow Node.js backend to call this

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
OUR_EMOTIONS = ["joy", "sadness", "anger", "fear",
                "surprise", "nostalgia", "curiosity", "calm"]

# ─────────────────────────────────────────────
# LOAD MODELS ON STARTUP
# ─────────────────────────────────────────────

def load_models():
    """Load the trained models into memory once at startup."""
    try:
        with open(os.path.join(MODELS_DIR, "emotion_classifier.pkl"), "rb") as f:
            model = pickle.load(f)
        with open(os.path.join(MODELS_DIR, "vectorizer.pkl"), "rb") as f:
            vectorizer = pickle.load(f)
        with open(os.path.join(MODELS_DIR, "mlb.pkl"), "rb") as f:
            mlb = pickle.load(f)
        print("✅ Models loaded successfully")
        return model, vectorizer, mlb
    except FileNotFoundError:
        print("❌ Models not found. Run training/train_emotion_model.py first.")
        sys.exit(1)

model, vectorizer, mlb = load_models()


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"[^a-z\s']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def classify_text(text: str) -> dict:
    """Run text through classifier, return 8 emotion probability scores."""
    cleaned = clean_text(text)
    if not cleaned:
        return {e: 0.0 for e in OUR_EMOTIONS}
    vec = vectorizer.transform([cleaned])
    proba = model.predict_proba(vec)[0]
    return {e: round(float(p), 4) for e, p in zip(OUR_EMOTIONS, proba)}


# Card weights — how much each emotion card boosts dimensions
CARD_WEIGHTS = {
    "nostalgic":   {"nostalgia": 0.6, "sadness": 0.2},
    "hyped":       {"joy": 0.5, "surprise": 0.3},
    "empty":       {"sadness": 0.5, "calm": 0.2},
    "anxious":     {"fear": 0.6, "anger": 0.1},
    "cozy":        {"calm": 0.5, "joy": 0.2},
    "inspired":    {"curiosity": 0.4, "joy": 0.3},
    "heartbroken": {"sadness": 0.7, "nostalgia": 0.2},
    "bored":       {"calm": 0.3, "sadness": 0.2},
    "angry":       {"anger": 0.7},
    "curious":     {"curiosity": 0.7, "surprise": 0.2},
    "lonely":      {"sadness": 0.4, "nostalgia": 0.3},
    "content":     {"calm": 0.6, "joy": 0.2},
}


def build_fingerprint(text_scores: dict,
                      selected_cards: list,
                      context: dict) -> dict:
    """
    Combine text classifier output + emotion cards + context
    into one normalised 8-dimension emotion fingerprint.
    """
    # Text scores carry 60% weight
    fp = {e: text_scores.get(e, 0.0) * 0.6 for e in OUR_EMOTIONS}

    # Cards carry remaining 40%, split across selected cards
    if selected_cards:
        card_weight = 0.4 / len(selected_cards)
        for card in selected_cards:
            if card in CARD_WEIGHTS:
                for emotion, w in CARD_WEIGHTS[card].items():
                    fp[emotion] = fp.get(emotion, 0.0) + w * card_weight

    # Context nudges
    if context.get("mode") == "lift":
        fp["joy"]  = min(1.0, fp["joy"]  + 0.1)
        fp["calm"] = min(1.0, fp["calm"] + 0.1)

    if context.get("company") == "alone":
        fp["nostalgia"] = min(1.0, fp["nostalgia"] + 0.05)

    # Normalise 0–1
    max_val = max(fp.values()) or 1.0
    fp = {e: round(v / max_val, 4) for e, v in fp.items()}

    return fp


def invert_fingerprint(fp: dict) -> dict:
    """Contrast mode — flip to emotional opposite."""
    return {e: round(1.0 - v, 4) for e, v in fp.items()}


def average_fingerprints(fingerprints: list) -> dict:
    """Group mode — element-wise average of multiple fingerprints."""
    if not fingerprints:
        return {e: 0.0 for e in OUR_EMOTIONS}
    result = {e: 0.0 for e in OUR_EMOTIONS}
    for fp in fingerprints:
        for e in OUR_EMOTIONS:
            result[e] += fp.get(e, 0.0)
    n = len(fingerprints)
    return {e: round(result[e] / n, 4) for e in OUR_EMOTIONS}


def cosine_similarity(vec_a: dict, vec_b: dict) -> float:
    """
    Cosine similarity between two emotion fingerprint dicts.
    Returns a float 0–1. Higher = more similar emotionally.
    """
    a = np.array([vec_a.get(e, 0.0) for e in OUR_EMOTIONS])
    b = np.array([vec_b.get(e, 0.0) for e in OUR_EMOTIONS])
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return round(float(np.dot(a, b) / (norm_a * norm_b)), 4)


# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Quick check that Flask is running."""
    return jsonify({"status": "ok", "service": "Sentio ML API"})


# ── Route 1: Classify free text ─────────────
@app.route("/classify", methods=["POST"])
def classify():
    """
    Input:  { "text": "I'm exhausted but nostalgic" }
    Output: { "scores": { "joy": 0.1, "sadness": 0.6, ... } }

    Called by Node backend when user submits free text.
    """
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "text field required"}), 400

    text = str(data["text"])[:500]  # cap at 500 chars
    if not text.strip():
        return jsonify({"error": "empty text"}), 400

    scores = classify_text(text)
    return jsonify({"scores": scores})


# ── Route 2: Build full fingerprint ──────────
@app.route("/fingerprint", methods=["POST"])
def fingerprint():
    """
    Input:
    {
      "text": "Feeling empty after that ending",
      "cards": ["empty", "nostalgic"],
      "context": {
        "company": "alone",
        "time": "long",
        "mode": "lean"
      }
    }

    Output:
    {
      "fingerprint": { "joy":0.1, "sadness":0.7, ... },
      "text_scores": { ... }   (raw classifier output, for debug)
    }

    This is the main route Node calls after collecting all 3 inputs.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "no data"}), 400

    text    = str(data.get("text", ""))[:500]
    cards   = data.get("cards", [])
    context = data.get("context", {})

    # validate cards
    valid_cards = list(CARD_WEIGHTS.keys())
    cards = [c for c in cards if c in valid_cards]

    # validate context
    valid_context = {
        "company": context.get("company", "alone"),
        "time":    context.get("time", "any"),
        "mode":    context.get("mode", "lean"),
    }

    # classify text
    text_scores = classify_text(text) if text.strip() else \
                  {e: 0.0 for e in OUR_EMOTIONS}

    # build fingerprint
    fp = build_fingerprint(text_scores, cards, valid_context)

    # if contrast mode, invert
    if valid_context["mode"] == "contrast":
        fp = invert_fingerprint(fp)

    return jsonify({
        "fingerprint": fp,
        "text_scores": text_scores,
    })


# ── Route 3: Group fingerprint ───────────────
@app.route("/group-fingerprint", methods=["POST"])
def group_fingerprint():
    """
    Input:
    {
      "fingerprints": [
        { "joy":0.8, "sadness":0.1, ... },
        { "joy":0.3, "sadness":0.6, ... }
      ]
    }

    Output:
    {
      "group_fingerprint": { "joy":0.55, "sadness":0.35, ... }
    }

    Called when all members of a group have submitted their mood.
    Node collects all fingerprints, sends here, gets back the average.
    """
    data = request.get_json()
    if not data or "fingerprints" not in data:
        return jsonify({"error": "fingerprints array required"}), 400

    fingerprints = data["fingerprints"]
    if not isinstance(fingerprints, list) or len(fingerprints) == 0:
        return jsonify({"error": "at least one fingerprint required"}), 400

    group_fp = average_fingerprints(fingerprints)
    return jsonify({"group_fingerprint": group_fp})


# ── Route 4: Match content to fingerprint ────
@app.route("/match", methods=["POST"])
def match():
    """
    Input:
    {
      "fingerprint": { "joy":0.1, "sadness":0.7, ... },
      "content": [
        {
          "id": "abc123",
          "title": "Tamasha",
          "type": "movie",
          "fingerprint": { "joy":0.4, "sadness":0.5, ... }
        },
        ...
      ],
      "top_n": 10
    }

    Output:
    {
      "matches": [
        { "id": "abc123", "title": "Tamasha", "score": 0.91 },
        ...
      ]
    }

    Node sends user fingerprint + candidate content list.
    Flask computes cosine similarity and returns ranked results.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "no data"}), 400

    user_fp  = data.get("fingerprint", {})
    content  = data.get("content", [])
    top_n    = int(data.get("top_n", 10))

    if not user_fp or not content:
        return jsonify({"error": "fingerprint and content required"}), 400

    # Score each content item
    scored = []
    for item in content:
        item_fp = item.get("fingerprint", {})
        score = cosine_similarity(user_fp, item_fp)
        scored.append({
            "id":    item.get("id"),
            "title": item.get("title"),
            "type":  item.get("type"),
            "score": score,
        })

    # Sort by score descending, return top N
    scored.sort(key=lambda x: x["score"], reverse=True)
    return jsonify({"matches": scored[:top_n]})


# ─────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    debug = os.environ.get("FLASK_ENV") != "production"
    print(f"🚀 Sentio ML API starting on http://localhost:{port}")
    print("   Routes:")
    print("   GET  /health")
    print("   POST /classify")
    print("   POST /fingerprint")
    print("   POST /group-fingerprint")
    print("   POST /match")
    app.run(host="0.0.0.0", port=port, debug=debug)