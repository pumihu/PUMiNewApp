export type WorkspaceMode = "build" | "learn" | "creative";

export interface Workspace {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  mode: WorkspaceMode;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceCreate {
  title: string;
  description?: string;
  mode?: WorkspaceMode;
}
