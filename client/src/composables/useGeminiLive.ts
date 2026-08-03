import { ref, onUnmounted, getCurrentInstance } from 'vue';
import { useUIStore } from '@/stores/ui';
import { toast } from 'vue-sonner';
import { io, Socket } from 'socket.io-client';

interface GeminiLiveConfig {
    archiveId: string;
    projectId?: string;
    token?: string;
    isMaster?: boolean;
    liveContext?: string;
    productIds?: string;
    language?: string;
    onToolCall?: (toolCall: any) => void; // Callback for avatar control
    onTextResponse?: (text: string, metadata?: { 
        emotion?: string, 
        gesture?: string, 
        action?: string, 
        actionPayload?: any,
        isConsolidated?: boolean 
    }) => void; // Callback for TTS bridge
}

export function useGeminiLive() {
    const socketRef = ref<Socket | null>(null);
    const isConnected = ref(false);
    const isSpeaking = ref(false);
    const audioLevel = ref(0);
    const sessionId = ref<string | null>(null);
    const archiveName = ref<string>('');
    const voiceName = ref<string>('');
    const isCameraActive = ref(false);
    const isAudioPlaying = ref(false);
    const isMuted = ref(false);
    const lastAudioTime = ref(0);
    const isTurnComplete = ref(false);

    // Audio context for playback
    let audioContext: AudioContext | null = null;
    let audioQueue: AudioBuffer[] = [];
    let isPlaying = false;
    let currentSource: AudioBufferSourceNode | null = null;
    let activeSources: AudioBufferSourceNode[] = [];
    let nextStartTime = 0;
    let schedulerTimeoutId: any = null;
    let preFillTimer: any = null;

    // Microphone stream
    let mediaStream: MediaStream | null = null;
    let audioProcessor: ScriptProcessorNode | null = null;
    let audioAnalyser: AnalyserNode | null = null;
    let outputAnalyser: AnalyserNode | null = null; 
    let animationFrameId: number | null = null;

    // Audio Output Stream
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    let mixedAudioStream = ref<MediaStream | null>(null);

    // Video capture
    let videoStream: MediaStream | null = null;
    let videoTimer: any = null;
    const videoCanvas = document.createElement('canvas');
    const videoElement = document.createElement('video');
    videoElement.muted = true;
    videoElement.playsInline = true;

    let toolCallCallback: ((toolCall: any) => void) | null = null;
    let textResponseCallback: ((text: string, metadata?: { 
        emotion?: string, 
        gesture?: string, 
        action?: string, 
        actionPayload?: any,
        isConsolidated?: boolean 
    }) => void) | null = null;
    let audioChunkCallback: ((chunk: string) => void) | null = null;
    let swarmMessageCallback: ((message: any) => void) | null = null;
    let questCallback: ((event: any) => void) | null = null;
    let interruptedCallback: (() => void) | null = null;

    // Reconnection State
    const manualDisconnect = ref(false);
    const lastConfig = ref<GeminiLiveConfig | null>(null);
    const reconnectAttempts = ref(0);
    const MAX_RECONNECT_ATTEMPTS = 10;
    let reconnectTimer: any = null;


    /**
     * Connect to Live Studio WebSocket
     */
    async function connect(config: GeminiLiveConfig): Promise<void> {
        if (socketRef.value) {
            if (socketRef.value.connected) {
                console.warn('[GeminiLive] Already connected');
                return;
            }
            console.warn('[GeminiLive] Cleaning up old disconnected/stale socket before reconnecting');
            socketRef.value.disconnect();
            socketRef.value = null;
        }

        manualDisconnect.value = false;
        lastConfig.value = config;
        isTurnComplete.value = false;

        let domain = window.location.origin;
        
        // Check for existing session ID to resume
        const storedSessionId = localStorage.getItem(`gemini_live_session_${config.archiveId}`);
        
        console.log('[GeminiLive] Connecting to Socket.io /live namespace');
        
        return new Promise((resolve, reject) => {
            // Guard: ensure the promise is only settled once
            let settled = false;
            const settle = (fn: () => void) => {
                if (settled) return;
                settled = true;
                fn();
            };

            const timeoutId = setTimeout(() => {
                if (socketRef.value) {
                    socketRef.value.disconnect();
                    socketRef.value = null;
                }
                settle(() => reject(new Error('Connection timeout (30s)')));
            }, 30000);

            const socketInstance = io(`${domain}/live`, {
                path: '/socket.io',
                transports: ['websocket', 'polling'],
                reconnection: false,
                query: {
                    archiveId: config.archiveId,
                    projectId: config.projectId || '',
                    token: config.token || '',
                    isMaster: config.isMaster ? 'true' : 'false',
                    liveContext: config.liveContext || '',
                    productIds: config.productIds || '',
                    language: config.language || '',
                    resumeSessionId: storedSessionId || ''
                }
            });

            // Store socketRef immediately so subsequent calls detect connecting socket
            socketRef.value = socketInstance;

            socketInstance.on('connect', () => {
                console.log('[GeminiLive] Socket.io connected (id:', socketInstance.id, ')');
            });

            socketInstance.on('message', (message: any) => {
                try {
                    handleMessage(message);

                    if (message.type === 'connected') {
                        clearTimeout(timeoutId);
                        console.log('[GeminiLive] Connection handshake complete:', message.sessionId);
                        
                        // Initialize audio output immediately for mixer (Before triggering connected state)
                        initAudioOutput();

                        isConnected.value = true;
                        sessionId.value = message.sessionId;
                        archiveName.value = message.influencerName || message.archiveName;
                        voiceName.value = message.voiceName;
                        reconnectAttempts.value = 0; // Reset on success

                        // Store for future reconnection
                        localStorage.setItem(`gemini_live_session_${config.archiveId}`, message.sessionId);

                        if (message.isResumed) {
                            toast.success(`Reconnected to ${archiveName.value || 'Influencer'}`);
                        } else {
                            toast.success(`Connected to ${archiveName.value || 'Influencer'}`);
                        }
                        
                        settle(() => resolve());
                    }
                } catch (error) {
                    console.error('[GeminiLive] Error parsing message:', error);
                }
            });

            socketInstance.on('connect_error', (error: any) => {
                clearTimeout(timeoutId);
                console.error('[GeminiLive] Socket.io connection error:', error);
                settle(() => reject(error));
            });

            socketInstance.on('disconnect', (reason: string) => {
                clearTimeout(timeoutId);
                console.log(`[GeminiLive] Socket.io disconnected: ${reason}`);
                
                isConnected.value = false;
                socketRef.value = null;

                // Stop inputs and clear audio queue if we lost connection
                stopAudioAnalysis();
                stopPlayback();
                
                // Automatic Reconnection with Exponential Backoff
                if (reason !== 'io client disconnect' && !manualDisconnect.value && reconnectAttempts.value < MAX_RECONNECT_ATTEMPTS) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 30000);
                    reconnectAttempts.value++;
                    
                    console.warn(`[GeminiLive] Abnormal closure. Attempting reconnect ${reconnectAttempts.value}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms...`);
                    
                    // User feedback for first few attempts
                    if (reconnectAttempts.value <= 3) {
                        toast.warning(`Influencer connection lost. Reconnecting... (Attempt ${reconnectAttempts.value})`, { duration: 2000 });
                    }

                    if (reconnectTimer) clearTimeout(reconnectTimer);
                    reconnectTimer = setTimeout(() => {
                        reconnectTimer = null;
                        if (lastConfig.value && !manualDisconnect.value) {
                            connect(lastConfig.value).catch(e => console.log('[GeminiLive] Reconnect backoff silent fail:', e));
                        }
                    }, delay);
                } else if (reason !== 'io client disconnect') {
                     console.error('[GeminiLive] Connection lost permanently or max attempts reached.');
                     toast.error('Influencer connection lost permanently.', { duration: 2000 });
                     stopMicrophone(); // Fully stop if we can't reconnect
                     stopCamera();
                }

                // Only reject during handshake phase on unexpected server-side disconnects.
                // Never reject on 'io client disconnect' — that is an intentional client-side
                // disconnect (e.g. the 30s timeout handler or a manual disconnect call) and
                // the promise has already been settled by the timeout or connect_error path.
                if (!sessionId.value && reason !== 'io client disconnect') {
                    settle(() => reject(new Error(`Socket.io disconnected before handshake: ${reason}`)));
                }
            });
        });
    }

    /**
     * Set tool call callback
     */
    function setToolCallCallback(callback: (toolCall: any) => void): void {
        toolCallCallback = callback;
    }

    /**
     * Set swarm message callback
     */
    function setSwarmMessageCallback(callback: (message: any) => void): void {
        swarmMessageCallback = callback;
    }

    /**
     * Set text response callback
     */
    const setTextResponseCallback = (callback: (text: string, metadata?: { 
        emotion?: string, 
        gesture?: string, 
        action?: string, 
        actionPayload?: any,
        isConsolidated?: boolean 
    }) => void) => {
        textResponseCallback = callback;
    };

    /**
     * Set quest event callback
     */
    function setQuestCallback(callback: (event: any) => void): void {
        questCallback = callback;
    }

    /**
     * Set interrupted callback
     */
    function setInterruptedCallback(callback: () => void): void {
        interruptedCallback = callback;
    }

    /**
     * Set audio level callback
     */
    function setAudioCallback(callback: (level: number) => void): void {
        watch(audioLevel, (val) => {
            callback(val);
        });
    }

    /**
     * Handle incoming WebSocket messages
     */
    function handleMessage(message: any): void {
        try {
            switch (message.type) {
                case 'audio':
                    // Decode and play audio chunk
                    if (!isMuted.value) {
                        playAudioChunk(message.data, message.mimeType);
                    }
                    if (message.turnComplete) {
                        console.log('[GeminiLive] Turn complete flag from audio chunk');
                        isTurnComplete.value = true;
                    }
                    break;

                case 'turn_complete':
                    console.log('[GeminiLive] Turn complete message received');
                    isTurnComplete.value = true;
                    break;

                case 'text':
                    console.log('[GeminiLive] Text response:', message.text);
                    if (textResponseCallback) {
                        const nowTime = audioContext ? audioContext.currentTime : 0;
                        const latencyMs = audioContext && nextStartTime > nowTime
                            ? Math.max(0, (nextStartTime - nowTime) * 1000)
                            : 0;
                        if (latencyMs > 0) {
                            setTimeout(() => {
                                if (textResponseCallback) {
                                    textResponseCallback(message.text, { 
                                        emotion: message.emotion, 
                                        gesture: message.gesture,
                                        action: message.action,
                                        actionPayload: message.actionPayload,
                                        isConsolidated: message.isConsolidated
                                    });
                                }
                            }, latencyMs);
                        } else {
                            textResponseCallback(message.text, { 
                                emotion: message.emotion, 
                                gesture: message.gesture,
                                action: message.action,
                                actionPayload: message.actionPayload,
                                isConsolidated: message.isConsolidated
                            });
                        }
                    }
                    break;

                case 'interrupted':
                    console.log('[GeminiLive] Interrupted');
                    // stopPlayback();
                    // isTurnComplete.value = false;
                    if (interruptedCallback) {
                        interruptedCallback();
                    }
                    break;

                case 'error':
                    console.error('[GeminiLive] Error:', message.message);
                    toast.error(message.message);
                    break;

                case 'tool_call':
                    console.log('[GeminiLive] Tool call received:', message.toolCall);
                    if (toolCallCallback) {
                        const nowTime = audioContext ? audioContext.currentTime : 0;
                        const latencyMs = audioContext && nextStartTime > nowTime
                            ? Math.max(0, (nextStartTime - nowTime) * 1000)
                            : 0;
                        if (latencyMs > 0) {
                            console.log(`[GeminiLive] Delaying tool call by ${latencyMs.toFixed(0)}ms for audio sync`);
                            setTimeout(() => {
                                if (toolCallCallback) {
                                    toolCallCallback(message.toolCall);
                                }
                            }, latencyMs);
                        } else {
                            toolCallCallback(message.toolCall);
                        }
                    }
                    break;

                case 'swarm_message':
                    console.log('[GeminiLive] Swarm message received:', message);
                    if (swarmMessageCallback) {
                        swarmMessageCallback(message);
                    }
                    break;

                case 'quest_created':
                case 'quest_updated':
                case 'quest_floor_assigned':
                case 'quest_evaluated':
                    console.log('[GeminiLive] Quest event:', message.type, message);
                    if (questCallback) {
                        questCallback(message);
                    }
                    break;
            }
        } catch (error) {
            console.error('[GeminiLive] Error handling message in handleMessage:', error);
        }
    }

    /**
     * Start microphone capture
     */
    async function startMicrophone(existingStream?: MediaStream): Promise<void> {
        try {
            mediaStream = existingStream || await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    sampleRate: 24000,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });

            // Ensure AudioContext is ready
            initAudioOutput();

            // Set up audio analyser for lip-sync
            if (!audioContext) {
                audioContext = new AudioContext({ sampleRate: 24000 });
            }

            const source = audioContext.createMediaStreamSource(mediaStream);
            
            // Analyser for UI
            audioAnalyser = audioContext.createAnalyser();
            audioAnalyser.fftSize = 256;
            source.connect(audioAnalyser);

            startAudioAnalysis();

            // Set up PCM Processor
            audioProcessor = audioContext.createScriptProcessor(2048, 1, 1);
            source.connect(audioProcessor);
            audioProcessor.connect(audioContext.destination);

            audioProcessor.onaudioprocess = (e) => {
                if (!isConnected.value || !socketRef.value?.connected) return;

                const inputData = e.inputBuffer.getChannelData(0);
                // Downsample from 24000Hz to 16000Hz for Gemini Live (3:2 ratio)
                const ratio = 24000 / 16000;
                const newLength = Math.floor(inputData.length / ratio);
                const pcmData = new Int16Array(newLength);
                
                for (let i = 0; i < newLength; i++) {
                    const sample = inputData[Math.floor(i * ratio)];
                    const s = Math.max(-1, Math.min(1, sample));
                    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                // Send as base64
                const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(pcmData.buffer) as any));
                socketRef.value.emit('message', {
                    type: 'audio',
                    data: base64,
                    mimeType: 'audio/pcm;rate=16000'
                });
            };

            isSpeaking.value = true;
            console.log('[GeminiLive] Microphone started (PCM mode)');
        } catch (error) {
            console.error('[GeminiLive] Failed to start microphone:', error);
            toast.error('Failed to access microphone');
            throw error;
        }
    }

    /**
     * Stop microphone capture
     */
    function stopMicrophone(): void {
        if (audioProcessor) {
            audioProcessor.disconnect();
            audioProcessor = null;
        }

        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }

        isSpeaking.value = false;
        stopAudioAnalysis();
        console.log('[GeminiLive] Microphone stopped');
    }

    /**
     * Start camera capture for vision
     */
    async function startCamera(): Promise<MediaStream> {
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 15 }
                }
            });
            isCameraActive.value = true;
            
            videoElement.srcObject = videoStream;
            await videoElement.play();
            
            // Start periodic frame capture (2fps for better responsiveness)
            videoTimer = setInterval(captureFrame, 500);
            
            console.log('[GeminiLive] Camera started');
            return videoStream;
        } catch (error) {
            console.error('[GeminiLive] Failed to start camera:', error);
            toast.error('Failed to access camera');
            throw error;
        }
    }

    /**
     * Stop camera capture
     */
    function stopCamera(): void {
        if (videoTimer) {
            clearInterval(videoTimer);
            videoTimer = null;
        }
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        videoElement.srcObject = null;
        isCameraActive.value = false;
        console.log('[GeminiLive] Camera stopped');
    }

    /**
     * Capture frame and send to Gemini
     */
    function captureFrame(): void {
        if (!videoStream || !isConnected.value || !isCameraActive.value) return;

        const ctx = videoCanvas.getContext('2d');
        if (ctx) {
            // High quality capture but manageable size
            videoCanvas.width = 640;
            videoCanvas.height = 480;
            ctx.drawImage(videoElement, 0, 0, 640, 480);
            
            // Split to get base64 data only
            const base64 = videoCanvas.toDataURL('image/jpeg', 0.6).split(',')[1];
            
            if (socketRef.value && socketRef.value.connected) {
                socketRef.value.emit('message', {
                    type: 'video',
                    data: base64,
                    mimeType: 'image/jpeg'
                });
            }
        }
    }

    /**
     * Manually send a video frame (base64)
     */
    function sendVideoFrame(base64: string): void {
        if (!socketRef.value || !socketRef.value.connected) return;

        socketRef.value.emit('message', {
            type: 'video',
            data: base64,
            mimeType: 'image/jpeg'
        });
    }

    /**
     * Send text to Gemini
     */
    function sendText(text: string): void {
        if (!socketRef.value || !socketRef.value.connected) return;

        isTurnComplete.value = false;
        socketRef.value.emit('message', {
            type: 'text',
            text: text
        });
    }

    /**
     * Send talk prompt to server (Standard mode support)
     */
    function sendPrompt(prompt: string, context?: any): void {
        if (!socketRef.value || !socketRef.value.connected) return;

        isTurnComplete.value = false;
        socketRef.value.emit('message', {
            type: 'talk',
            prompt,
            context
        });
    }

    /**
     * Enable/disable vision status manually
     */
    function setVisionActive(active: boolean): void {
        isCameraActive.value = active;
    }

    /**
     * Send tool response back to Gemini
     */
    function sendToolResponse(callId: string, name: string, result: any): void {
        if (!socketRef.value || !socketRef.value.connected) return;

        socketRef.value.emit('message', {
            type: 'tool_response',
            functionResponses: [
                {
                    id: callId,
                    name: name,
                    response: result
                }
            ]
        });
    }

    /**
     * Start audio level analysis for lip-sync
     */
    function startAudioAnalysis(): void {
        const analyze = () => {
            let maxAverage = 0;

            // 1. Analyze Output (Gemini Speech)
            if (outputAnalyser) {
                const dataArray = new Uint8Array(outputAnalyser.frequencyBinCount);
                outputAnalyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                maxAverage = average;
            }

            audioLevel.value = maxAverage / 255; // Normalize to 0-1
            animationFrameId = requestAnimationFrame(analyze);
        };

        analyze();
    }

    /**
     * Stop audio analysis
     */
    function stopAudioAnalysis(): void {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        audioLevel.value = 0;
    }

    /**
     * Initialize Audio Context and Output Destination
     */
    function initAudioOutput(): void {
        if (!audioContext) {
            audioContext = new AudioContext({ sampleRate: 24000 });
        }
        
        if (!audioDestination) {
            audioDestination = audioContext.createMediaStreamDestination();
            mixedAudioStream.value = audioDestination.stream;
            
            // Connect output analyser if it exists
            if (outputAnalyser) {
                outputAnalyser.connect(audioDestination);
            }
        }
    }

    /**
     * Play audio chunk from Gemini
     */
    async function playAudioChunk(base64Data: string, mimeType: string): Promise<void> {
        if (!base64Data) return; // Skip empty signaling chunks
        
        lastAudioTime.value = Date.now();

        if (!audioContext) {
            audioContext = new AudioContext({ sampleRate: 24000 });
            nextStartTime = audioContext.currentTime;
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        try {
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            let audioBuffer: AudioBuffer;

            if (mimeType && (mimeType.includes('mpeg') || mimeType.includes('mp3'))) {
                // Decode full compressed audio (like MP3 from TTS)
                audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
            } else {
                // Handle raw PCM16 (from Gemini Live API)
                // Ensure even byte length for PCM16 (16-bit, 2 bytes per sample)
                const evenLength = bytes.length - (bytes.length % 2);
                
                // Copy to a perfectly-aligned new ArrayBuffer to avoid byteOffset/RangeErrors
                const pcmBuffer = new ArrayBuffer(evenLength);
                const pcmBytes = new Uint8Array(pcmBuffer);
                pcmBytes.set(bytes.subarray(0, evenLength));

                const pcm16 = new Int16Array(pcmBuffer);
                const float32 = new Float32Array(pcm16.length);
                
                for (let i = 0; i < pcm16.length; i++) {
                    float32[i] = pcm16[i] / 32768.0;
                }

                audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
                audioBuffer.getChannelData(0).set(float32);
            }
            
            audioQueue.push(audioBuffer);
            
            // Set isAudioPlaying to true immediately on buffer enqueue to prevent premature step progression
            isAudioPlaying.value = true;

            // Pre-fill buffer: Start playing only when we have enough chunks (solid stream)
            // We use a low threshold (2 chunks) to minimize latency, plus a 50ms fallback timer
            // so single/short chunks never get stuck.
            if (!isPlaying && audioQueue.length > 0) {
                if (audioQueue.length >= 2) {
                    if (preFillTimer) {
                        clearTimeout(preFillTimer);
                        preFillTimer = null;
                    }
                    playNextChunk();
                } else {
                    if (preFillTimer) clearTimeout(preFillTimer);
                    preFillTimer = setTimeout(() => {
                        if (!isPlaying && audioQueue.length > 0) {
                            playNextChunk();
                        }
                    }, 50);
                }
            }
        } catch (error) {
            console.error('[GeminiLive] Error playing audio:', error);
        }
    }

    /**
     * Play next audio chunk from queue
     */
    /**
     * Lookahead scheduler to fill the audio pipeline
     */
    function scheduleAudio(): void {
        const now = audioContext?.currentTime || 0;
        
        // Keep scheduling as long as we have chunks and we're less than 300ms ahead
        // Also stop scheduling if muted
        while (audioQueue.length > 0 && nextStartTime < now + 0.3 && !isMuted.value) {
            isPlaying = true;
            isAudioPlaying.value = true;
            const buffer = audioQueue.shift()!;
            
            // Ensure output analyser is connected
            if (!outputAnalyser && audioContext) {
                outputAnalyser = audioContext.createAnalyser();
                outputAnalyser.fftSize = 256;
                
                // Route to both speakers (monitoring) and mixer (broadcast)
                if (!audioDestination) {
                    audioDestination = audioContext.createMediaStreamDestination();
                    mixedAudioStream.value = audioDestination.stream;
                }
                
                outputAnalyser.connect(audioContext.destination);
                outputAnalyser.connect(audioDestination);
                
                if (!animationFrameId) startAudioAnalysis();
            }

            const source = audioContext!.createBufferSource();
            source.buffer = buffer;
            source.connect(outputAnalyser!);

            // Ensure we don't start in the past
            if (nextStartTime < now) {
                nextStartTime = now + 0.01;
            }

            source.start(nextStartTime);
            activeSources.push(source);
            
            source.onended = () => {
                const index = activeSources.indexOf(source);
                if (index !== -1) {
                    activeSources.splice(index, 1);
                }
                if (audioQueue.length === 0 && activeSources.length === 0) {
                    isPlaying = false;
                    isAudioPlaying.value = false;
                }
            };

            nextStartTime += buffer.duration;
            
            // Mark as finished locally since we don't use onended for chaining anymore
            // result is smooth back-to-back playback
        }

        if (audioQueue.length === 0 && activeSources.length === 0 && nextStartTime < now) {
            isPlaying = false;
            isAudioPlaying.value = false;
        }

        if (isPlaying) {
            schedulerTimeoutId = setTimeout(scheduleAudio, 100);
        } else {
            schedulerTimeoutId = null;
        }
    }

    function playNextChunk(): void {
        if (!audioContext) return;
        scheduleAudio();
    }

    /**
     * Stop audio playback
     */
    function stopPlayback(): void {
        audioQueue = [];
        if (schedulerTimeoutId) {
            clearTimeout(schedulerTimeoutId);
            schedulerTimeoutId = null;
        }
        if (preFillTimer) {
            clearTimeout(preFillTimer);
            preFillTimer = null;
        }
        // Stop and disconnect all currently active scheduled sources
        activeSources.forEach(source => {
            try {
                source.stop();
                source.disconnect();
            } catch (e) {}
        });
        activeSources = [];

        if (currentSource) {
            try {
                currentSource.stop();
                currentSource.disconnect();
            } catch (e) {}
            currentSource = null;
        }
        isPlaying = false;
        isAudioPlaying.value = false;
        isTurnComplete.value = false;
        nextStartTime = audioContext?.currentTime || 0;
    }

    /**
     * Disconnect from Live Studio
     */
    function disconnect(): void {
        manualDisconnect.value = true;
        reconnectAttempts.value = 0;
        
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }

        if (preFillTimer) {
            clearTimeout(preFillTimer);
            preFillTimer = null;
        }

        stopMicrophone();
        stopCamera();
        stopPlayback();

        if (socketRef.value) {
            socketRef.value.disconnect();
            socketRef.value = null;
        }

        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }

        isConnected.value = false;
        sessionId.value = null;
        console.log('[GeminiLive] Disconnected manually');
    }

    // Cleanup on unmount (only if in a component context)
    if (getCurrentInstance()) {
        onUnmounted(() => {
            disconnect();
        });
    }

    return {
        // State
        isConnected,
        isSpeaking,
        isAudioPlaying,
        isMuted,
        audioLevel,
        lastAudioTime,
        isTurnComplete,
        isCameraActive,
        sessionId,
        archiveName,
        voiceName,

        // Methods
        connect,
        disconnect,
        startMicrophone,
        stopMicrophone,
        startCamera,
        stopCamera,
        sendVideoFrame,
        sendText,
        sendPrompt,
        setVisionActive,
        setToolCallCallback,
        setSwarmMessageCallback,
        setTextResponseCallback,
        getTextResponseCallback: () => textResponseCallback,
        setQuestCallback,
        setInterruptedCallback,
        setAudioCallback,
        sendToolResponse,
        getAudioStream: () => mixedAudioStream
    };
}
