"""
Trains the v2 flood/cyclone risk classifier on the dataset produced by
generate_dataset.py. Run that first -- this script expects
data/risk_training_data.csv to already exist and won't regenerate it, so
training always runs against data you've actually inspected, not a fresh
silently-different batch.
"""

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split

RISK_BINS = [-1, 25, 50, 75, 101]
RISK_LABELS = ["low", "medium", "high", "severe"]


def v1_rule_score(rainfall_mm: float, river_level_m: float, elevation_m: float) -> float:
    """Mirrors apps/api/src/lib/riskScoring.ts exactly -- the point of
    training v2 is to measurably beat this, so the comparison below has to
    be against the real production rule, not an approximation of it."""
    score = 0.0
    score += min(rainfall_mm / 3, 40)
    score += min(river_level_m * 5, 40)
    score += max(0, 20 - elevation_m * 2)
    return min(100, score)


def main():
    df = pd.read_csv("data/risk_training_data.csv")

    X = df[["rainfall_mm", "river_level_m", "elevation_m"]]
    y = df["risk_level"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(n_estimators=200, max_depth=8, random_state=42)
    model.fit(X_train, y_train)

    v2_preds = model.predict(X_test)
    print("=== v2 (trained model) ===")
    print(classification_report(y_test, v2_preds))

    v1_scores = X_test.apply(
        lambda row: v1_rule_score(row.rainfall_mm, row.river_level_m, row.elevation_m), axis=1
    )
    v1_preds = pd.cut(v1_scores, bins=RISK_BINS, labels=RISK_LABELS)

    v1_acc = accuracy_score(y_test, v1_preds)
    v2_acc = accuracy_score(y_test, v2_preds)
    print(f"v1 rule accuracy on the same test set:  {v1_acc:.3f}")
    print(f"v2 model accuracy on the same test set: {v2_acc:.3f}")

    joblib.dump(model, "data/risk_model.joblib")
    print("Saved data/risk_model.joblib")


if __name__ == "__main__":
    main()