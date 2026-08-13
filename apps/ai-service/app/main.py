from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional

app = FastAPI(
    title="RakkhaNet AI Service",
    description="Python FastAPI NLP microservice for relief request triage prioritization",
    version="1.0.0"
)

class RequestPayload(BaseModel):
    description: str
    severity: str

class TriageResponse(BaseModel):
    priorityScore: float
    urgency: str

@app.get("/")
def read_root():
    return {"status": "online", "message": "RakkhaNet AI Service microservice endpoint"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/v1/triage", response_model=TriageResponse)
def triage_request(payload: RequestPayload, x_internal_token: Optional[str] = Header(None)):
    description_lower = payload.description.lower()
    base_score = 15.0
    
    if payload.severity == "MEDIUM":
        base_score = 45.0
    elif payload.severity == "HIGH":
        base_score = 70.0
    elif payload.severity == "CRITICAL":
        base_score = 90.0

    # Keyphrase scoring
    critical_keywords = ["drown", "trap", "injured", "bleed", "heart", "die", "infant", "pregnant", "submerged"]
    high_keywords = ["hungry", "starving", "thirst", "dehydrated", "medicine", "sick", "elderly", "collapsing"]

    bonus = 0.0
    for kw in critical_keywords:
        if kw in description_lower:
            bonus += 15.0
            break

    for kw in high_keywords:
        if kw in description_lower:
            bonus += 10.0
            break

    priority_score = max(0.0, min(100.0, base_score + bonus))
    
    urgency = "LOW"
    if priority_score >= 85.0:
        urgency = "CRITICAL"
    elif priority_score >= 70.0:
        urgency = "HIGH"
    elif priority_score >= 45.0:
        urgency = "MEDIUM"

    return TriageResponse(priorityScore=priority_score, urgency=urgency)
