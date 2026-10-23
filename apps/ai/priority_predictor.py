"""
Loads the trained request-triage model once and exposes a single clean
prediction function. Deliberately has no FastAPI/HTTP code in it -- that is
4c-4. Like predictor.py, this module should be fully testable by importing
it directly, with nothing running as a server.
"""

from pathlib import Path

import joblib

# Resolved relative to this file, not the working directory, so it loads the
# same way whether the service is started from apps/ai or somewhere else.
_MODEL_PATH = Path(__file__).parent / "data" / "priority_model.joblib"

# Below this top-class probability the model is treated as "not sure", and
# callers should show NO suggestion. Chosen from the held-out test set
# (train_priority_model.py's split):
#
#   min confidence   share that gets a suggestion   accuracy of those
#   none             100%                            83.8%
#   0.50             74%                             90.7%
#   0.55             61%                             92.2%
#   0.60             52%                             94.3%
#
# Nonsense or off-topic text ("asdf qwerty", Bangla in English letters)
# scored 0.43-0.51, because the model falls back to the class frequencies it
# saw in training; clearly worded requests scored 0.84-0.90. 0.55 sits just
# above the nonsense range. It was picked on the same test set that produced
# the table, so the table is slightly optimistic -- treat the number as a
# judgement call, not a derived constant. Showing nothing is the safe
# default: this is only ever a hint, never a decision.
MIN_CONFIDENCE = 0.55

_model = None


def _get_model():
    global _model
    if _model is None:
        _model = joblib.load(_MODEL_PATH)
    return _model


def predict_priority(description: str) -> dict:
    """
    Returns the model's suggested priority for a free-text description, plus
    its confidence, the full probability distribution over all four levels,
    and `confident` -- whether the top probability clears MIN_CONFIDENCE.

    The suggestion is returned even when `confident` is False, so callers can
    log it, but a caller that shows it to people should check `confident`
    first. English text only: other languages get a label but a low
    confidence, which is exactly what the threshold is for.
    """
    if not isinstance(description, str) or not description.strip():
        raise ValueError("description must be a non-empty string")

    model = _get_model()

    # The pipeline (TF-IDF + logistic regression) takes a list of raw strings.
    probabilities = dict(zip(model.classes_, model.predict_proba([description])[0]))
    priority = max(probabilities, key=probabilities.get)
    confidence = float(probabilities[priority])

    return {
        "priority": str(priority),
        "confidence": round(confidence, 3),
        "confident": confidence >= MIN_CONFIDENCE,
        "probabilities": {str(k): round(float(v), 3) for k, v in probabilities.items()},
    }