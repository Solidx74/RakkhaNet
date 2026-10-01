"""
Loads the trained v2 risk model once and exposes a single clean prediction
function. Deliberately has no FastAPI/HTTP code in it -- that's 4b-4. This
module should be fully testable by importing it directly, with nothing
running as a server.
"""

import joblib
import pandas as pd

_model = None


def _get_model():
    global _model
    if _model is None:
        _model = joblib.load("data/risk_model.joblib")
    return _model


def predict_risk_level(rainfall_mm: float, river_level_m: float, elevation_m: float) -> dict:
    """
    Returns the predicted risk level plus the model's confidence and full
    probability distribution across all four classes -- the probabilities
    matter as much as the top prediction, since a "high" prediction at 40%
    confidence vs 95% confidence should probably be treated differently
    downstream (e.g. by the Express fallback logic in 4b-5).
    """
    model = _get_model()

    # scikit-learn expects a 2D array of samples; we're always predicting
    # one sample at a time here, so a single-row DataFrame with matching
    # column names avoids sklearn's "fitted without feature names" warning.
    X = pd.DataFrame(
        [[rainfall_mm, river_level_m, elevation_m]],
        columns=["rainfall_mm", "river_level_m", "elevation_m"],
    )

    predicted_class = model.predict(X)[0]
    probabilities = dict(zip(model.classes_, model.predict_proba(X)[0]))
    confidence = probabilities[predicted_class]

    return {
        "riskLevel": predicted_class,
        "confidence": round(float(confidence), 3),
        "probabilities": {k: round(float(v), 3) for k, v in probabilities.items()},
    }