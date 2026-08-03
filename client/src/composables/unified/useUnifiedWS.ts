/**
 * useUnifiedWS.ts
 * Vue 3 composable for unified WebSocket communication and event subscription.
 */

import { ref, onMounted, onUnmounted } from 'vue';
import { unifiedWSClient } from '@/services/unified/UnifiedWSClient';
import { clientEventBus } from '@/services/unified/ClientEventBus';
import { UnifiedWSEvent, WSEventMessage, VoiceSessionConfig, StreamStartPayload } from '@/services/unified/UnifiedWSEventTypes';

export function useUnifiedWS() {
  const isConnected = ref(unifiedWSClient.isConnected());
  const activeUnsubscribers: Array<() => void> = [];

  const handleConnect = () => {
    isConnected.value = true;
  };

  const handleDisconnect = () => {
    isConnected.value = false;
  };

  onMounted(() => {
    unifiedWSClient.initConnection();
    
    activeUnsubscribers.push(clientEventBus.on(UnifiedWSEvent.SYSTEM_CONNECT, handleConnect));
    activeUnsubscribers.push(clientEventBus.on(UnifiedWSEvent.SYSTEM_DISCONNECT, handleDisconnect));
  });

  onUnmounted(() => {
    activeUnsubscribers.forEach(unsub => unsub());
    activeUnsubscribers.length = 0;
  });

  /**
   * Subscribe to a specific unified WS event with automatic cleanup on component unmount
   */
  const onEvent = <T = any>(event: UnifiedWSEvent, callback: (message: WSEventMessage<T>) => void) => {
    const unsub = clientEventBus.on<T>(event, callback);
    activeUnsubscribers.push(unsub);
    return unsub;
  };

  return {
    isConnected,
    send: (event: UnifiedWSEvent, payload: any, personaId?: string, sessionId?: string) => 
      unifiedWSClient.send(event, payload, personaId, sessionId),
    
    onEvent,
    
    // Helper methods
    startVoiceSession: (config: VoiceSessionConfig) => unifiedWSClient.startVoiceSession(config),
    stopVoiceSession: (personaId: string) => unifiedWSClient.stopVoiceSession(personaId),
    sendAudioChunk: (personaId: string, pcmBuffer: ArrayBuffer) => unifiedWSClient.sendAudioChunk(personaId, pcmBuffer),
    startLivestream: (payload: StreamStartPayload) => unifiedWSClient.startLivestream(payload),
    stopLivestream: (streamId: string) => unifiedWSClient.stopLivestream(streamId)
  };
}
