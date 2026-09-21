from fastapi import Depends, FastAPI

import config
from auth import verify_service_token

app = FastAPI(title="RakkhaNet AI Service")


@app.get("/health")
def health():
    return {"status": "ok", "betterAuthUrl": config.BETTER_AUTH_URL}


@app.get("/whoami")
def whoami(payload: dict = Depends(verify_service_token)):
    return {"sub": payload.get("sub"), "email": payload.get("email")}