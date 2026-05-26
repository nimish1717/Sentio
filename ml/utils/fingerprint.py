# ============================================================
# Sentio — Fingerprint Builder
# Takes 3 inputs → returns one 8-dimension emotion vector
# ============================================================

OUR_EMOTIONS = ["joy", "sadness", "anger", "fear",
                "surprise", "nostalgia", "curiosity", "calm"]

# How much each emotion card boosts a dimension
# Each card directly adds weight to one or more dimensions
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
    Combine all three inputs into one emotion fingerprint.

    Parameters
    ----------
    text_scores   : dict — output from Flask classifier
                    e.g. {"joy":0.2, "sadness":0.7, ...}
    selected_cards: list — e.g. ["nostalgic", "empty"]
    context       : dict — e.g. {"company":"alone",
                                  "time":"long",
                                  "mode":"lean"}

    Returns
    -------
    dict — normalised 8-dimension emotion fingerprint
    """

    # Start with text classifier scores (weighted 60%)
    fingerprint = {e: text_scores.get(e, 0.0) * 0.6
                   for e in OUR_EMOTIONS}

    # Add card weights (weighted 40% total, split across selected cards)
    if selected_cards:
        card_contribution_weight = 0.4 / len(selected_cards)
        for card in selected_cards:
            if card in CARD_WEIGHTS:
                for emotion, weight in CARD_WEIGHTS[card].items():
                    fingerprint[emotion] += weight * card_contribution_weight

    # Context adjustments — small nudges based on answers
    # "lift" mode: boost joy and calm, dampen sadness slightly
    if context.get("mode") == "lift":
        fingerprint["joy"]  = min(1.0, fingerprint["joy"]  + 0.1)
        fingerprint["calm"] = min(1.0, fingerprint["calm"] + 0.1)

    # "alone" slightly boosts nostalgia and sadness
    if context.get("company") == "alone":
        fingerprint["nostalgia"] = min(1.0, fingerprint["nostalgia"] + 0.05)

    # Normalise so all values are between 0 and 1
    max_val = max(fingerprint.values()) or 1.0
    fingerprint = {e: round(v / max_val, 4) for e, v in fingerprint.items()}

    return fingerprint


def invert_fingerprint(fingerprint: dict) -> dict:
    """
    Contrast mode — flip the fingerprint to its emotional opposite.
    High sadness becomes low sadness, etc.
    Used when user selects 'lift my mood / contrast mode'.
    """
    return {e: round(1.0 - v, 4) for e, v in fingerprint.items()}


def average_fingerprints(fingerprints: list) -> dict:
    """
    Group mode — average multiple people's fingerprints.
    Each fingerprint is a dict with 8 emotion keys.
    Returns the element-wise mean as the group fingerprint.
    """
    if not fingerprints:
        return {e: 0.0 for e in OUR_EMOTIONS}

    group = {e: 0.0 for e in OUR_EMOTIONS}
    for fp in fingerprints:
        for e in OUR_EMOTIONS:
            group[e] += fp.get(e, 0.0)

    n = len(fingerprints)
    return {e: round(group[e] / n, 4) for e in OUR_EMOTIONS}