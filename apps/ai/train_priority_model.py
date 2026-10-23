"""
4c-2: trains the request-triage model (TF-IDF + logistic regression) on the
dataset produced by generate_priority_dataset.py, and compares it against a
simple keyword-rule baseline on the SAME held-out test set -- the same
structure as train_risk_model.py. Run the generator first; this script
expects data/priority_training_data.csv to already exist.

Run from apps/ai (paths are relative):
    python train_priority_model.py
"""

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

LEVELS = ["low", "medium", "high", "critical"]

# --- Keyword baseline -------------------------------------------------------
# What a reasonable person would write without any training: scan for words
# and take the highest level any of them maps to. Written BEFORE looking at
# any model result and not adjusted afterwards, so it can't be tuned to make
# the model look better. It deliberately has no idea about negation ("nobody
# is injured" still matches "injured"), combinations, or duration -- that is
# exactly the gap the comparison is meant to measure.
CRITICAL_WORDS = [
    "trapped", "stuck", "collapsing", "capsized", "up to the neck",
    "cannot leave", "drowning",
]
HIGH_WORDS = [
    "bleeding", "breathing", "insulin", "fever", "injured", "hurt", "broken",
    "weak", "danger", "emergency", "urgent",
]
MEDIUM_WORDS = [
    "run out", "no food", "no clean water", "hungry", "finished", "shelter",
    "nowhere", "roof", "flooded", "underwater", "no place",
]


def keyword_rule(description: str) -> str:
    text = description.lower()
    if any(w in text for w in CRITICAL_WORDS):
        return "critical"
    if any(w in text for w in HIGH_WORDS):
        return "high"
    if any(w in text for w in MEDIUM_WORDS):
        return "medium"
    return "low"


def build_pipeline() -> Pipeline:
    return Pipeline(
        [
            (
                "tfidf",
                # Word pairs matter here: "nobody is injured" vs "is injured"
                # differ only in the bigrams. min_df=2 drops one-off tokens.
                TfidfVectorizer(
                    lowercase=True, ngram_range=(1, 2), min_df=2, sublinear_tf=True
                ),
            ),
            ("clf", LogisticRegression(max_iter=1000, random_state=42)),
        ]
    )


def main():
    df = pd.read_csv("data/priority_training_data.csv")

    X = df["description"]
    y = df["priority"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = build_pipeline()
    model.fit(X_train, y_train)

    model_preds = model.predict(X_test)
    print("=== trained model (TF-IDF + logistic regression) ===")
    print(classification_report(y_test, model_preds, labels=LEVELS, zero_division=0))
    print("Confusion matrix (rows = true, columns = predicted):")
    print(
        pd.DataFrame(
            confusion_matrix(y_test, model_preds, labels=LEVELS),
            index=LEVELS,
            columns=LEVELS,
        ).to_string()
    )

    rule_preds = X_test.apply(keyword_rule)
    print("\n=== keyword-rule baseline ===")
    print(classification_report(y_test, rule_preds, labels=LEVELS, zero_division=0))

    rule_acc = accuracy_score(y_test, rule_preds)
    model_acc = accuracy_score(y_test, model_preds)
    print(f"keyword rule accuracy on the same test set:   {rule_acc:.3f}")
    print(f"trained model accuracy on the same test set:  {model_acc:.3f}")

    # Informal probe, NOT a metric: hand-written sentences that are not from
    # the generator's templates. Shows how far the model generalizes beyond
    # the wording it was trained on (expect it to be shaky off-template).
    probes = [
        "We are stuck on the roof and the water keeps rising",
        "Nobody is injured, we just need some blankets",
        "URGENT URGENT please help we need a charger for our phone",
        "My mother is diabetic and out of insulin since two days",
        "The kids are hungry and we have no rice left",
        "ami bachte chai",
    ]
    print("\n=== informal probe (hand-written, off-template) ===")
    for text, pred in zip(probes, model.predict(pd.Series(probes))):
        print(f"  [{pred:>8}] {text}")

    # Saved model = the one evaluated above (trained on the 80% split, not
    # refit on all data), so the file on disk matches the reported numbers.
    joblib.dump(model, "data/priority_model.joblib")
    print("\nSaved data/priority_model.joblib")


if __name__ == "__main__":
    main()