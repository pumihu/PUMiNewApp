export interface CreativeBrief {
  title: string;
  objective: string;
  audience: string;
  tone: string;
  key_messages: string[];
  constraints?: string;
}

export interface VisualDirection {
  name: string;
  rationale: string;
  image_prompt: string;
}

export interface StoryboardScene {
  scene_title: string;
  image_prompt: string;
  voiceover: string;
  camera_direction: string;
}

export interface BriefRequest {
  workspace_id: string;
  goal: string;
  locale?: string;
}

export interface VisualizeRequest {
  workspace_id: string;
  brief: string;
  locale?: string;
}

export interface StoryboardRequest {
  workspace_id: string;
  brief: string;
  locale?: string;
}
