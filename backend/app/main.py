from __future__ import annotations

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import ensure_schema

from app.modules.auth.router import router as auth_router
from app.modules.workspace.router import router as workspace_router
from app.modules.canvas.router import router as canvas_router
from app.modules.mentor.router import router as mentor_router
from app.modules.documents.router import router as documents_router
from app.modules.creative.router import router as creative_router
from app.modules.tts.router import router as tts_router

BUILD = os.getenv("BUILD_TAG", "v2.0.0")

app = FastAPI(title="PUMi v2 API", version=BUILD)

_env_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [o.strip() for o in _env_origins.split(",") if o.strip()] or [
    "https://emoria.life",
    "https://www.emoria.life",
    "https://pu-mi-new-app.vercel.app",
    "https://pu-mi-new-app-git-main-pum-i-team.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://pu-mi-new-.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(workspace_router)
app.include_router(canvas_router)
app.include_router(mentor_router)
app.include_router(documents_router)
app.include_router(creative_router)
app.include_router(tts_router)


@app.on_event("startup")
def on_startup():
    ensure_schema()
    print(f"[startup] PUMi v2 API ready — build={BUILD}")


@app.get("/health")
def health():
    return {"status": "ok", "version": BUILD}
