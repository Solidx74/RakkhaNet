"""
4c-1: synthetic training data for the request-triage model.

Generates short, English relief-request descriptions labeled with a priority
(low / medium / high / critical). The label comes from a hidden scoring rule
over the *meaning* of the pieces the text is built from -- not from which
keywords appear -- on purpose:

  * A reassurance such as "nobody is injured" contains an alarming word but
    LOWERS the priority (negation).
  * A vulnerable person (child, elderly, pregnant, disabled) RAISES the
    priority only when there is a real need -- a combination, not a keyword.
  * A long duration raises the priority for shortages and medical needs, but
    not for a request that is already a rescue.
  * Urgency words ("urgent", "please help") are sprinkled on at random,
    independent of the label, because real people over-use them. A keyword
    rule can't tell those apart; a model that has seen enough examples can.

HONEST CAVEAT (same as the v2 risk model): this is synthetic text built from
MY templates. A model trained on it learns these templates, so the dataset
tests the pipeline and the "rule vs. learned model" comparison -- it is NOT
evidence the model understands real citizens' messages, and the margin by
which the model beats the keyword baseline is partly built in by how the
data was designed. Say so in the write-up.

Run from apps/ai (the output path is relative):
    python generate_priority_dataset.py
"""

import random
from pathlib import Path

import pandas as pd

SEED = 42
N_SAMPLES = 4000
# Fraction of labels moved one level up or down, to mimic two human labelers
# disagreeing on a borderline case. Without it the data is perfectly
# separable and every accuracy number would be meaninglessly high.
LABEL_NOISE = 0.07
OUTPUT_PATH = Path("data/priority_training_data.csv")

LEVELS = ["low", "medium", "high", "critical"]

# name -> (base score, sampling weight, phrasings)
NEED_GROUPS: dict[str, tuple[int, float, list[str]]] = {
    "minor": (
        0,
        0.25,
        [
            "we need a few extra blankets",
            "we would like to know where the nearest shelter is",
            "we need some dry clothes",
            "our tube well is working slowly",
            "we need candles and matches",
            "we want to know when the water will go down",
            "our phone needs charging and we have no electricity",
        ],
    ),
    "shortage": (
        1,
        0.20,
        [
            "we have run out of drinking water",
            "we have almost no food left",
            "there is no clean water to drink",
            "our rice and dry food are finished",
            "we have no baby food or milk left",
            "we cannot cook because everything is wet and we are hungry",
        ],
    ),
    "shelter": (
        1,
        0.15,
        [
            "our house is flooded and we have nowhere to sleep",
            "the storm damaged our roof and we need a place to stay",
            "our home is underwater and we need shelter",
            "we lost our house and have no place to go",
        ],
    ),
    "medical": (
        2,
        0.20,
        [
            "someone has a high fever and keeps vomiting",
            "a family member has a deep cut that will not stop bleeding",
            "my father has run out of his insulin",
            "someone is having trouble breathing",
            "a person here has severe diarrhea and is very weak",
            "someone has a badly swollen and possibly broken leg",
        ],
    ),
    "rescue": (
        3,
        0.20,
        [
            "we are trapped on the roof of our house",
            "we are stuck inside and cannot get out",
            "our boat capsized and we are holding on to a tree",
            "the wall of our house is collapsing",
            "the water is inside our house up to the neck and we cannot leave",
        ],
    ),
}

# Modifiers.
VULNERABLE = [
    "there are three small children with us",
    "we have an elderly woman with us",
    "a pregnant woman is with us",
    "a family member with a disability is here",
    "there is a baby with us",
    "my grandfather who cannot walk is here",
]
DANGER_UP = [
    "the water is rising quickly",
    "it is getting dark and the water is still rising",
    "the current is getting stronger",
]
DANGER_DOWN = [
    "the water has stopped rising",
    "the water level is going down now",
]
# Contain alarming words ON PURPOSE -- they lower priority.
REASSURANCE = [
    "luckily nobody is injured",
    "no one is trapped or in danger right now",
    "this is not an emergency",
    "everyone is safe for now",
    "nobody is hurt",
]
DURATION_LONG = [
    "this has been going on for two days",
    "we have been like this for three days",
    "it has been more than two days",
]
DURATION_SHORT = [
    "it started this morning",
    "it started a few hours ago",
    "it began last night",
]

# Appear independent of the label, like real over-used urgency language.
OPENERS = [
    "Please help",
    "Urgent",
    "Hello",
    "Please send help as soon as possible",
    "Assalamu alaikum",
    "Help us please",
]
LOCATION_FILLER = [
    "we are in our village near the river",
    "we are near the bazar",
    "we live close to the embankment",
    "we are on the second floor of a neighbour's house",
    "our area has had no help yet",
]


def label_from_score(score: int) -> str:
    if score <= 0:
        return "low"
    if score == 1:
        return "medium"
    if score == 2:
        return "high"
    return "critical"


def build_example(rng: random.Random) -> tuple[str, str]:
    names = list(NEED_GROUPS)
    group = rng.choices(names, weights=[NEED_GROUPS[n][1] for n in names])[0]
    base, _, phrasings = NEED_GROUPS[group]

    parts = [rng.choice(phrasings)]
    score = base

    # Vulnerable people only raise priority when there is a real need.
    if rng.random() < 0.35:
        parts.append(rng.choice(VULNERABLE))
        if base >= 1:
            score += 1

    # Danger trend: rising water raises priority for everyone; "stopped
    # rising" only lowers it where the need isn't already a rescue.
    r = rng.random()
    if r < 0.20:
        parts.append(rng.choice(DANGER_UP))
        score += 1
    elif r < 0.30:
        parts.append(rng.choice(DANGER_DOWN))
        if base <= 2:
            score -= 1

    # Reassurance (negated alarming words) lowers priority below rescue.
    if rng.random() < 0.20:
        parts.append(rng.choice(REASSURANCE))
        if base <= 2:
            score -= 1

    # Duration matters for shortages, shelter and medical needs only.
    if rng.random() < 0.35:
        if rng.random() < 0.5:
            parts.append(rng.choice(DURATION_LONG))
            if base in (1, 2):
                score += 1
        else:
            parts.append(rng.choice(DURATION_SHORT))

    if rng.random() < 0.40:
        parts.append(rng.choice(LOCATION_FILLER))

    rng.shuffle(parts)

    # Urgency language, independent of the label.
    if rng.random() < 0.35:
        parts.insert(0, rng.choice(OPENERS))

    text = ". ".join(p[0].upper() + p[1:] for p in parts)
    if rng.random() < 0.7:
        text += "."
    if rng.random() < 0.15:
        text = text.lower()

    label = label_from_score(score)

    # Label noise: move one level up or down (clamped at the ends).
    if rng.random() < LABEL_NOISE:
        i = LEVELS.index(label) + rng.choice([-1, 1])
        label = LEVELS[min(max(i, 0), len(LEVELS) - 1)]

    return text, label


def main() -> None:
    rng = random.Random(SEED)
    seen: set[str] = set()
    rows: list[tuple[str, str]] = []

    # Unique descriptions only: a duplicate landing in both the train and
    # test split later would inflate the test accuracy.
    attempts = 0
    while len(rows) < N_SAMPLES and attempts < N_SAMPLES * 20:
        attempts += 1
        text, label = build_example(rng)
        if text in seen:
            continue
        seen.add(text)
        rows.append((text, label))

    if len(rows) < N_SAMPLES:
        print(f"WARNING: only {len(rows)} unique examples after {attempts} tries")

    df = pd.DataFrame(rows, columns=["description", "priority"])
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)

    print(f"Saved {len(df)} rows to {OUTPUT_PATH}")
    print("\nClass distribution:")
    print(df["priority"].value_counts().reindex(LEVELS).to_string())
    print("\nSample rows:")
    for level in LEVELS:
        print(f"\n[{level}]")
        for text in df[df["priority"] == level]["description"].head(3):
            print(f"  - {text}")


if __name__ == "__main__":
    main()