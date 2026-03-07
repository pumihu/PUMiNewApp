from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.core.deps import get_current_user_id
from app.core.schemas import OkResponse
from app.modules.canvas.schemas import CanvasBlock, CanvasBlockCreate, CanvasBlockPatch
from app.modules.canvas import service

router = APIRouter(prefix="/canvas", tags=["canvas"])


@router.post("/block", response_model=CanvasBlock)
def create_block(body: CanvasBlockCreate, user_id: str = Depends(get_current_user_id)):
    try:
        return service.create_block(body, user_id)
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")


@router.patch("/block/{block_id}", response_model=CanvasBlock)
def patch_block(block_id: str, body: CanvasBlockPatch, user_id: str = Depends(get_current_user_id)):
    block = service.patch_block(block_id, body, user_id)
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
    return block


@router.post("/block/{block_id}", response_model=CanvasBlock)
def patch_block_post_compat(block_id: str, body: CanvasBlockPatch, user_id: str = Depends(get_current_user_id)):
    """Compatibility endpoint for proxies limited to POST forwarding."""
    block = service.patch_block(block_id, body, user_id)
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
    return block


@router.delete("/block/{block_id}", response_model=OkResponse)
def delete_block(block_id: str, user_id: str = Depends(get_current_user_id)):
    deleted = service.delete_block(block_id, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
    return OkResponse()


@router.post("/block/{block_id}/delete", response_model=OkResponse)
def delete_block_post_compat(block_id: str, user_id: str = Depends(get_current_user_id)):
    """Compatibility endpoint for proxies limited to POST forwarding."""
    deleted = service.delete_block(block_id, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
    return OkResponse()


@router.get("/{workspace_id}", response_model=List[CanvasBlock])
def list_blocks(workspace_id: str, user_id: str = Depends(get_current_user_id)):
    return service.list_blocks(workspace_id, user_id)
