# ============================================================
# Sentio — Text Preprocessor
# Used by both training script AND Flask API at runtime
# ============================================================

import re


def clean_text(text: str) -> str:
    """
    Clean raw user input before feeding to the classifier.
    Same cleaning must be used at training time AND inference time
    — otherwise the model sees different data than it was trained on.
    """
    if not text or not isinstance(text, str):
        return ""

    text = text.lower()
    text = re.sub(r"http\S+|www\S+", "", text)      # remove URLs
    text = re.sub(r"[^a-z\s']", " ", text)           # letters only
    text = re.sub(r"\s+", " ", text).strip()          # collapse spaces

    return text


def sanitize_input(text: str, max_length: int = 500) -> str:
    """
    Sanitize user input — trim length, strip dangerous characters.
    Called before clean_text as a security layer.
    """
    if not text:
        return ""

    # Trim to max length
    text = text[:max_length]

    # Strip HTML tags if any
    text = re.sub(r"<[^>]+>", "", text)

    # Strip leading/trailing whitespace
    text = text.strip()

    return text