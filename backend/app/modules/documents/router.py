from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user_id
from app.modules.documents import service
from app.modules.documents.schemas import (
    DocumentSummarizeRequest,
    DocumentSummaryBundle,
    DocumentUpload,
)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentSummaryBundle)
def upload_document(body: DocumentUpload, user_id: str = Depends(get_current_user_id)):
    try:
        return service.upload_document(body, user_id)
    except ValueError as exc:
        detail = str(exc)
        status_code = status.HTTP_404_NOT_FOUND if "not found" in detail.lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=detail)


@router.post("/summarize", response_model=DocumentSummaryBundle)
def summarize_document(body: DocumentSummarizeRequest, user_id: str = Depends(get_current_user_id)):
    try:
        return service.summarize_document(body, user_id)
    except ValueError as exc:
        detail = str(exc)
        status_code = status.HTTP_404_NOT_FOUND if "not found" in detail.lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=detail)
