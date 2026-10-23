import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field

import config
from auth import verify_service_token
from predictor import predict_risk_level
from priority_predictor import predict_priority


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Load each model (joblib load + first-time scikit-learn import) and run
    # one throwaway prediction BEFORE the server accepts requests. Measured
    # at ~5s on the first risk-model call vs ~0.09s afterwards; without this,
    # the first real request exceeds Express's 3s timeout and silently falls
    # back to the rule even though the AI service is healthy. The priority
    # model is warmed up for the same reason.
    start = time.perf_counter()
    predict_risk_level(rainfall_mm=0, river_level_m=0, elevation_m=0)
    print(f"[ai] risk model warmed up in {time.perf_counter() - start:.2f}s")

    start = time.perf_counter()
    predict_priority("warm up")
    print(f"[ai] priority model warmed up in {time.perf_counter() - start:.2f}s")
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


class PriorityPredictionRequest(BaseModel):
    # max_length matches reliefRequestCreateSchema.description (1000) in
    # packages/shared-types, so anything the API accepts as a description
    # is also accepted here. Whitespace-only text passes min_length, so the
    # route also checks for it (see predict_request_priority).
    description: str = Field(min_length=1, max_length=1000)


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


@app.post("/predict/priority")
def predict_request_priority(
    body: PriorityPredictionRequest,
    payload: dict = Depends(verify_service_token),
):
    # Returns a SUGGESTION only. Whether to show it (the `confident` flag)
    # and where to store it are the caller's decisions; nothing here ever
    # sets a request's real priority.
    try:
        return predict_priority(body.description)
    except ValueError as err:
        # Whitespace-only text: a client error, not a server crash.
        raise HTTPException(status_code=422, detail=str(err))