/**
 * UnifiedWSEventTypes.ts
 * Unified WebSocket Event Definitions for Client & Server communication.
 */

export enum UnifiedWSEvent {
  // System / Connection Lifecycle
  SYSTEM_CONNECT = 'system:connect',
  SYSTEM_DISCONNECT = 'system:disconnect',
  SYSTEM_PING = 'system:ping',
  SYSTEM_PONG = 'system:pong',
  SYSTEM_ERROR = 'system:error',

  // Voice AI Agent Session Lifecycle
  VOICE_SESSION_INIT = 'voice:session_init',
  VOICE_SESSION_START = 'voice:session_start',
  VOICE_SESSION_STOP = 'voice:session_stop',
  VOICE_AUDIO_CHUNK = 'voice:audio_chunk',
  VOICE_TEXT_CHUNK = 'voice:text_chunk',
  VOICE_INTERRUPT = 'voice:interrupt',

  // FSM & Storyboard Controls
  FSM_START = 'fsm:start',
  FSM_STOP = 'fsm:stop',
  FSM_STATE_CHANGE = 'fsm:state_change',
  FSM_SCRIPT_TRIGGER = 'fsm:script_trigger',
  FSM_TOOL_CALL = 'fsm:tool_call',

  // Live Stream Controls & Status
  LIVESTREAM_START = 'livestream:start',
  LIVESTREAM_STOP = 'livestream:stop',
  STREAM_STATUS = 'stream:status',

  // RTMP Restreaming Relay Controls & Status
  RTMP_RELAY_START = 'rtmp:relay_start',
  RTMP_RELAY_STOP = 'rtmp:relay_stop',
  RTMP_RELAY_STATUS = 'rtmp:relay_status',

  // Commerce & Engagement Updates
  COMMERCE_SPOTLIGHT = 'commerce:spotlight',
  GAMIFICATION_UPDATE = 'gamification:update',
  AUDIENCE_QUEST_UPDATE = 'audience:quest_update'
}

export interface WSEventMessage<T = any> {
  event: UnifiedWSEvent;
  sessionId?: string;
  personaId?: string;
  timestamp: number;
  payload: T;
}

export interface VoiceSessionConfig {
  personaId: string;
  archiveId: string;
  projectId?: string;
  liveContext?: string;
  productIds?: string;
  language?: string;
}

export interface StreamStartPayload {
  streamId: string;
  projectId: string;
  platforms?: Array<{
    id: string;
    rtmpUrl: string;
    streamKey: string;
  }>;
  productIds?: string[];
  autonomousMode?: boolean;
}

export interface StreamStatusPayload {
  streamId: string;
  active: boolean;
  viewers?: number;
  bitrate?: number;
  fps?: number;
  message?: string;
}

export interface RTMPRelayStatusPayload {
  streamId: string;
  targetPlatform: string;
  status: 'connecting' | 'active' | 'stopped' | 'failed';
  error?: string;
}
