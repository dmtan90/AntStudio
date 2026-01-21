export interface PromptSceneVideo {
  name: string;
  url: string;
  meta: {
    tags: string[];
    audios: PromptSceneAudio[];
  };
}

export interface PromptSceneAudio {
  name: string;
  url: string;
}

export interface PromptSceneSpeech {
  url: string;
  voice: string;
  gender: string;
  subtitle: string;
}

export interface PromptScene {
  video?: PromptSceneVideo;
  audio?: PromptSceneAudio;
  speech?: PromptSceneSpeech;
  duration: number;
}

export interface PromptSession {
  id: string;
  tags: string[];
  prompt: string;
  format: string;
  duration: number;
  scene: PromptScene[];
}
