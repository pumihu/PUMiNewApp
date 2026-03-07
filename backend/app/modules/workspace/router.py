from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.core.deps import get_current_user_id
from app.modules.workspace.schemas import Workspace, WorkspaceCreate
from app.modules.workspace import service

router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.post("/create", response_model=Workspace)
def create_workspace(body: WorkspaceCreate, user_id: str = Depends(get_current_user_id)):
    return service.create_workspace(user_id, body)


@router.get("/list", response_model=List[Workspace])
def list_workspaces(user_id: str = Depends(get_current_user_id)):
    return service.list_workspaces(user_id)


@router.get("/{workspace_id}", response_model=Workspace)
def get_workspace(workspace_id: str, user_id: str = Depends(get_current_user_id)):
    ws = service.get_workspace(workspace_id, user_id)
    if not ws:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return ws
