import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from pydantic import BaseModel, Field

import config
from auth import verify_service_token
from predictor import predict_risk_level


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Load the model (joblib load + first-time scikit-learn import) and run
    # one throwaway prediction BEFORE the server accepts requests. Measured
    # at ~5s on the first call vs ~0.09s afterwards; without this, the first
    # real request exceeds Express's 3s timeout and silently falls back to
    # the v1 rule even though the AI service is healthy.
    start = time.perf_counter()
    predict_risk_level(rainfall_mm=0, river_level_m=0, elevation_m=0)
    print(f"[ai] model warmed up in {time.perf_counter() - start:.2f}s")
    yield


app = FastAPI(title="RakkhaNet AI Service", lifespan=lifespan)


class RiskPredictionRequest(BaseModel):
    # Bounds deliberately track the training data's actual range (see
    # generate_dataset.py), not just "any positive number" -- outside that
    # range the model is extrapolating into territory it never saw, and a
    # confident-looking prediction there would be misleading rather than
    # useful. Small headroom above the training max, not an open range.
    rainfall_mm: float = Field(ge=0, le=350)
    river_level_m: float = Field(ge=0, le=12)
    elevation_m: float = Field(ge=0, le=25)


@app.get("/health")
def health():
    return {"status": "ok", "betterAuthUrl": config.BETTER_AUTH_URL}


@app.get("/whoami")
def whoami(payload: dict = Depends(verify_service_token)):
    return {"sub": payload.get("sub"), "email": payload.get("email")}


@app.post("/predict/risk")
def predict_risk(
    body: RiskPredictionRequest,
    payload: dict = Depends(verify_service_token),
):
    return predict_risk_level(
        rainfall_mm=body.rainfall_mm,
        river_level_m=body.river_level_m,
        elevation_m=body.elevation_m,
    )