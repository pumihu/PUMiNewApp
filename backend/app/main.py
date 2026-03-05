# app/main.py
from __future__ import annotations
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schemas import HealthOutput
from .db import db_ok

BUILD = os.getenv("BUILD_TAG", "V2-WORKSPACE-CANVAS-TUTOR")

app = FastAPI(title="pumi-backend", version=BUILD)

# CORS origins: env-based + hardcoded defaults
_env_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [o.strip() for o in _env_origins.split(",") if o.strip()] or [
    "https://emoria.life",
    "https://www.emoria.life",
    "https://pu-mi-new-app.vercel.app",
    "https://pu-mi-new-app-git-main-pum-i-team.vercel.app",
    "http://localhost:5173",
    "http://localhost:8080",
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

@app.on_event("startup")
def startup():
    # Log critical env vars (not secrets)
    sb_url = os.getenv("SUPABASE_URL", "")
    print(f"[startup] SUPABASE_URL(raw)={sb_url[:50]}..." if len(sb_url) > 50 else f"[startup] SUPABASE_URL(raw)={sb_url}")

    # NOTE: No ensure_schema() - Supabase schema is managed manually
    # NOTE: No direct psycopg2 DB connections - use Supabase REST client

    # preload billing env once at startup (warning only, no crash)
    try:
        from .billing import init_billing_env
        init_billing_env()
        print("[startup] Billing env initialized")
    except Exception as e:
        print(f"[startup] Billing init skipped (not fatal): {e}")

# Routers (REGISTER AT IMPORT TIME — not in startup)
from .chat_enhanced import router as chat_enhanced_router
from .guard import router as guard_router
from .usage import router as usage_router
from .summarize import router as summarize_router
from .billing import router as billing_router
from .webhooks import router as webhooks_router  # <-- IMPORTANT
from .account import router as account_router

# [LEGACY] LMS-style focus system — kept wired for frontend backwards compat.
# Source files archived in app/legacy/. Scheduled for removal once the new
# /workspace + /canvas + /tutor frontend screen is fully rolled out.
from .focus_api import router as focus_router
from .focusroom_api import router as focusroom_router

# v2 — AI Learning Workspace
from .workspace_api import router as workspace_router
from .canvas_api import router as canvas_router
from .tutor_api import router as tutor_router
from .tts_api import router as tts_router

# Core infrastructure
app.include_router(chat_enhanced_router)
app.include_router(guard_router)
app.include_router(usage_router)
app.include_router(summarize_router)
app.include_router(billing_router)
app.include_router(webhooks_router)  # <-- IMPORTANT
app.include_router(account_router)

# [LEGACY] — preserved for backwards compat; do not build new features here
app.include_router(focus_router)
app.include_router(focusroom_router)

# v2 — AI Learning Workspace (new surface)
app.include_router(workspace_router)
app.include_router(canvas_router)
app.include_router(tutor_router)
app.include_router(tts_router)

@app.get("/healthz", response_model=HealthOutput)
def healthz():
    routes = [r.path for r in app.router.routes if hasattr(r, "path")]
    return HealthOutput(db=db_ok(), build=BUILD, routes=routes)
