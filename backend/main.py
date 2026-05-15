from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import os
import json

# ── Load environment variables from .env file ──
load_dotenv()

# ── Initialize FastAPI app ──
app = FastAPI(
    title="CV Screener API",
    description="AI-powered CV screening using Groq + Llama 3.3",
    version="1.0.0"
)

# ── CORS — allows React frontend to talk to this backend ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://cv-screener-wine.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Initialize Groq client with API key from .env ──
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ── AI System Prompt ──
SYSTEM_PROMPT = """You are an expert technical recruiter AI assistant with 15+ years of experience.

When given a Job Description and a Candidate CV, analyze the fit carefully and return ONLY a valid JSON object.
No markdown, no explanation, no code fences. Just pure JSON.

The JSON must follow this exact structure:
{
  "overall_score": <integer 0-100>,
  "candidate_name": "<full name from CV, or Candidate if not found>",
  "years_experience": "<e.g. 5+ years or Unknown>",
  "verdict": "<exactly one of: Strong Match | Good Match | Potential Match | Weak Match>",
  "verdict_summary": "<2-3 sentence summary of overall fit for this role>",
  "breakdown": {
    "skills_score": <integer 0-100>,
    "experience_score": <integer 0-100>,
    "education_score": <integer 0-100>
  },
  "matched_skills": ["skill1", "skill2", "skill3"],
  "missing_skills": ["skill1", "skill2"],
  "partial_skills": ["skill1", "skill2"],
  "key_insights": [
    {"type": "positive", "text": "<specific positive observation>"},
    {"type": "neutral",  "text": "<neutral observation or area to explore>"},
    {"type": "negative", "text": "<gap or concern>"}
  ],
  "interview_questions": [
    "<targeted question based on a gap or experience>",
    "<question to verify a claimed skill>",
    "<question about career motivation>",
    "<question about a specific experience>",
    "<question about culture or role fit>"
  ],
  "red_flags": ["<flag if any, empty array if none>"],
  "recommendation": "<exactly one of: Shortlist | Consider | Reject>"
}"""


# ── Request Model ──
class ScreenRequest(BaseModel):
    job_description: str
    candidate_cv: str


# ── Health Check Route ──
@app.get("/health")
async def health():
    return {
        "status": "running",
        "model": "llama-3.3-70b-versatile",
        "provider": "Groq"
    }


# ── Main Screening Route ──
@app.post("/screen")
async def screen_cv(req: ScreenRequest):

    # Validate inputs
    if not req.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description is required.")
    if not req.candidate_cv.strip():
        raise HTTPException(status_code=400, detail="Candidate CV is required.")
    if len(req.job_description) < 10:
        raise HTTPException(status_code=400, detail="Job description is too short.")
    if len(req.candidate_cv) < 10:
        raise HTTPException(status_code=400, detail="Candidate CV is too short.")

    # Build the user message
    user_message = f"""Please analyze this candidate against the job description.

JOB DESCRIPTION:
{req.job_description}

CANDIDATE CV:
{req.candidate_cv}

Return ONLY the JSON object. No extra text before or after."""

    # ── Streaming generator ──
    def generate():
        try:
            stream = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_message},
                ],
                max_tokens=1500,
                temperature=0.1,
                stream=True,
            )

            # Send each token as it arrives
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield f"data: {json.dumps({'token': delta})}\n\n"

            # Signal that streaming is complete
            yield "data: [DONE]\n\n"

        except Exception as e:
            # Send error back to frontend
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )