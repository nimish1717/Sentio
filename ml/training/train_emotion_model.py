# ============================================================
# Sentio — Emotion Classifier Training Script (v2 — fixed)
# Fix: calm was dominating — added class balancing + better mapping
# ============================================================

import os
import pickle
import numpy as np
import pandas as pd
from datasets import load_dataset
from sklearn.linear_model import LogisticRegression
from sklearn.multiclass import OneVsRestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import re

# ─────────────────────────────────────────────
# 1. CONFIG
# ─────────────────────────────────────────────

EMOTION_MAP = {
    "joy":              "joy",
    "amusement":        "joy",
    "excitement":       "joy",
    "gratitude":        "joy",
    "love":             "joy",
    "optimism":         "joy",
    "pride":            "joy",
    "relief":           "joy",
    "sadness":          "sadness",
    "grief":            "sadness",
    "disappointment":   "sadness",
    "remorse":          "sadness",
    "anger":            "anger",
    "annoyance":        "anger",
    "disapproval":      "anger",
    "disgust":          "anger",
    "fear":             "fear",
    "nervousness":      "fear",
    "surprise":         "surprise",
    "realization":      "surprise",
    "confusion":        "surprise",
    "desire":           "nostalgia",
    "caring":           "nostalgia",
    "curiosity":        "curiosity",
    "admiration":       "curiosity",
    "approval":         "calm",
    # "neutral" intentionally NOT mapped — was causing calm to dominate
}

OUR_EMOTIONS = ["joy", "sadness", "anger", "fear",
                "surprise", "nostalgia", "curiosity", "calm"]

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODELS_DIR, exist_ok=True)


# ─────────────────────────────────────────────
# 2. LOAD
# ─────────────────────────────────────────────

def load_goemotions():
    print("📥 Loading GoEmotions dataset...")
    dataset = load_dataset("go_emotions", "simplified")
    label_names = dataset["train"].features["labels"].feature.names
    rows = []
    for split in ["train", "validation", "test"]:
        for item in dataset[split]:
            emotion_names = [label_names[i] for i in item["labels"]]
            rows.append({"text": item["text"], "raw_emotions": emotion_names})
    df = pd.DataFrame(rows)
    print(f"✅ Loaded {len(df)} samples")
    return df


# ─────────────────────────────────────────────
# 3. MAP + FILTER
# ─────────────────────────────────────────────

def map_and_filter(df):
    print("🔄 Mapping to 8 dimensions, dropping neutral-only rows...")

    def map_emotions(raw):
        mapped = set()
        for e in raw:
            if e in EMOTION_MAP:
                mapped.add(EMOTION_MAP[e])
        return list(mapped)

    df["emotions"] = df["raw_emotions"].apply(map_emotions)
    df = df[df["emotions"].apply(len) > 0].reset_index(drop=True)
    print(f"✅ {len(df)} samples after filtering")

    print("\nLabel distribution:")
    for emotion in OUR_EMOTIONS:
        count = df["emotions"].apply(lambda x: emotion in x).sum()
        print(f"  {emotion:12s}: {count:6d}  ({count/len(df)*100:.1f}%)")
    return df


# ─────────────────────────────────────────────
# 4. CLEAN
# ─────────────────────────────────────────────

def clean_text(text):
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"[^a-z\s']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def clean_dataset(df):
    print("\n🧹 Cleaning text...")
    df["text_clean"] = df["text"].apply(clean_text)
    df = df[df["text_clean"].str.len() > 3].reset_index(drop=True)
    print(f"✅ {len(df)} samples after cleaning")
    return df


# ─────────────────────────────────────────────
# 5. TRAIN
# ─────────────────────────────────────────────

def train(df):
    print("\n🚀 Training...")

    mlb = MultiLabelBinarizer(classes=OUR_EMOTIONS)
    Y = mlb.fit_transform(df["emotions"])

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=25000,
        sublinear_tf=True,
        min_df=2,
    )
    X = vectorizer.fit_transform(df["text_clean"])

    X_train, X_test, Y_train, Y_test = train_test_split(
        X, Y, test_size=0.1, random_state=42
    )
    print(f"  Train: {X_train.shape[0]} | Test: {X_test.shape[0]}")

    # class_weight='balanced' — KEY FIX
    # Makes model pay more attention to rare emotions (nostalgia, fear)
    # instead of always predicting the most common one (calm)
    model = OneVsRestClassifier(
        LogisticRegression(
            C=2.0,
            max_iter=1000,
            solver="lbfgs",
            class_weight="balanced",
        ),
        n_jobs=-1
    )

    print("⏳ Training... (1–3 minutes)")
    model.fit(X_train, Y_train)
    print("✅ Done!")

    Y_pred = model.predict(X_test)
    print("\n📊 Evaluation:")
    print(classification_report(Y_test, Y_pred,
                                 target_names=OUR_EMOTIONS,
                                 zero_division=0))
    return model, vectorizer, mlb


# ─────────────────────────────────────────────
# 6. SAVE
# ─────────────────────────────────────────────

def save_models(model, vectorizer, mlb):
    for fname, obj in [
        ("emotion_classifier.pkl", model),
        ("vectorizer.pkl", vectorizer),
        ("mlb.pkl", mlb),
    ]:
        with open(os.path.join(MODELS_DIR, fname), "wb") as f:
            pickle.dump(obj, f)
    print(f"\n💾 Models saved to {MODELS_DIR}/")


# ─────────────────────────────────────────────
# 7. TEST
# ─────────────────────────────────────────────

def predict_scores(text, model, vectorizer):
    cleaned = clean_text(text)
    vec = vectorizer.transform([cleaned])
    proba = model.predict_proba(vec)[0]
    return {e: round(float(p), 3)
            for e, p in zip(OUR_EMOTIONS, proba)}


def quick_test(model, vectorizer):
    tests = [
        "I'm exhausted but can't stop thinking about old memories",
        "So hyped for tomorrow, can't sleep!",
        "Feeling completely empty after that series ended",
        "Curious about how everything works in the universe",
        "Just want to sit in silence and do nothing",
        "Why does everything always go wrong for me",
        "I miss the way things used to be",
        "This is the best day of my life",
    ]
    print("\n🧪 Prediction test:")
    print("-" * 60)
    for text in tests:
        scores = predict_scores(text, model, vectorizer)
        top = max(scores, key=scores.get)
        sorted_s = dict(sorted(scores.items(),
                               key=lambda x: x[1], reverse=True))
        print(f"\n→ \"{text}\"")
        print(f"  Top: {top} ({scores[top]})")
        print(f"  All: {sorted_s}")


# ─────────────────────────────────────────────
# 8. MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    df = load_goemotions()
    df = map_and_filter(df)
    df = clean_dataset(df)
    model, vectorizer, mlb = train(df)
    save_models(model, vectorizer, mlb)
    quick_test(model, vectorizer)
    print("\n🎉 Classifier ready. Next: Flask API.")