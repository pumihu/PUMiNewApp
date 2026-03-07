from pydantic import BaseModel
from typing import Any


class OkResponse(BaseModel):
    ok: bool = True


class ErrorResponse(BaseModel):
    error: str
    detail: Any = None
