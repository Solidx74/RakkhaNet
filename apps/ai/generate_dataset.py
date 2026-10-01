"""
Generates the synthetic training dataset for the v2 risk-scoring model.
Kept as its own step, separate from training (see train_risk_model.py),
so the data itself can be inspected before anything is trained on it.

Honest framing, stated once here: there is no real historical Bangladesh
flood/river-gauge dataset wired in -- that isn't available to a student
project. This generator deliberately includes an interaction term
(rainfall matters more at low elevation) and a threshold effect (crossing
the river danger level sharply raises risk) that the v1 rule-based
scorer's linear weighted sum structurally cannot represent, so training a
model on this is a genuine methodological upgrade, not the same formula
reimplemented in Python.
"""

import os

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)
N_SAMPLES = 3000

RISK_BINS = [-1, 25, 50, 75, 101]
RISK_LABELS = ["low", "medium", "high", "severe"]


def generate_synthetic_data(n: int) -> pd.DataFrame:
    # Right-skewed, not uniform -- most places/times have modest rainfall
    # and river levels, with occasional severe spikes, matching how flood
    # risk actually distributes rather than an unrealistic 50/50 split.
    rainfall_mm = np.clip(RNG.exponential(scale=45, size=n), 0, 300)
    river_level_m = np.clip(RNG.exponential(scale=2.2, size=n), 0, 10)
    elevation_m = RNG.uniform(0, 20, n)

    # The "true" generating process includes an interaction term and a
    # threshold jump that a linear weighted-sum rule cannot represent --
    # this is what a trained model can capture and a hand-tuned rule can't.
    base = (
        rainfall_mm / 3
        + river_level_m * 5
        + np.maximum(0, 20 - elevation_m * 2)
        + 0.12 * rainfall_mm * (20 - elevation_m) / 20
        + np.where(river_level_m > 7, 18, 0)
    )
    raw_score = np.clip(base + RNG.normal(0, 8, n), 0, 100)

    risk_level = pd.cut(raw_score, bins=RISK_BINS, labels=RISK_LABELS)

    return pd.DataFrame(
        {
            "rainfall_mm": rainfall_mm.round(1),
            "river_level_m": river_level_m.round(2),
            "elevation_m": elevation_m.round(1),
            "raw_score": raw_score.round(1),
            "risk_level": risk_level,
        }
    )


def main():
    df = generate_synthetic_data(N_SAMPLES)

    os.makedirs("data", exist_ok=True)
    out_path = "data/risk_training_data.csv"
    df.to_csv(out_path, index=False)

    print(f"Generated {len(df)} samples -> {out_path}")
    print("\nClass distribution:")
    print(df["risk_level"].value_counts())
    print("\nFirst 5 rows:")
    print(df.head())


if __name__ == "__main__":
    main()