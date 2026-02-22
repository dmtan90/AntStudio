export interface WebRTCConfig {
    websocketUrl: string;
    streamId: string;
    videoBitrate?: number; // In kbps
    audioBitrate?: number; // In kbps
    maxFramerate?: number;
    onStats?: (stats: WebRTCStats) => void;
    onDisconnect?: () => void;
}

export interface WebRTCStats {
    bitrate: number; // kbps
    rtt: number; // ms
    packetsLost: number;
    framesEncoded: number;
    fps?: number;
    timestamp: number;
}

export class WebRTCPublisher {
    private pc: RTCPeerConnection | null = null;
    private ws: WebSocket | null = null;
    private config: WebRTCConfig;
    private localStream: MediaStream | null = null;
    private pingInterval: any = null;
    private statsInterval: any = null;
    private lastStats: any = {};

    constructor(config: WebRTCConfig) {
        this.config = config;
    }

    /**
     * Start publishing a stream
     */
    async start(stream: MediaStream) {
        console.log(`[WebRTC] Starting publisher for stream: ${this.config.streamId}`);
        console.log(`[WebRTC] WebSocket URL: ${this.config.websocketUrl}`);

        this.localStream = stream;
        this.ws = new WebSocket(this.config.websocketUrl);

        return new Promise<void>((resolve, reject) => {
            this.ws!.onopen = () => {
                console.log("[WebRTC] Signaling socket opened");
                this.startHeartbeat();
                // 1. Send publish command
                this.sendSignaling({
                    command: "publish",
                    streamId: this.config.streamId,
                    video: true,
                    audio: true
                });
            };

            this.ws!.onerror = (err) => {
                console.warn("[WebRTC] WebSocket connection failed. Ant Media Server may be offline.");
                this.config.onDisconnect?.();
                // Instead of rejecting immediately, we can check for a mock mode or retry
                reject(new Error("AMS_OFFLINE"));
            };

            this.ws!.onclose = () => {
                console.warn("[WebRTC] Signaling socket closed");
                this.config.onDisconnect?.();
            };

            this.ws!.onmessage = async (event) => {
                const msg = JSON.parse(event.data);
                console.log("[WebRTC] Received command:", msg.command);

                if (msg.command === "start") {
                    // 2. Received start confirmation from server, now create offer
                    await this.initPeerConnection();
                    resolve();
                } else if (msg.command === "takeConfiguration") {
                    // 4. Received answer from server
                    if (msg.type === "answer") {
                        console.log("[WebRTC] Received SDP answer");
                        await this.pc?.setRemoteDescription(new RTCSessionDescription({
                            type: "answer",
                            sdp: msg.sdp
                        }));
                    }
                } else if (msg.command === "takeCandidate") {
                    await this.pc?.addIceCandidate(new RTCIceCandidate({
                        candidate: msg.candidate,
                        sdpMLineIndex: msg.label,
                        sdpMid: msg.id
                    }));
                } else if (msg.command === "error") {
                    console.error("[WebRTC] Server error:", msg.definition);
                    reject(new Error(msg.definition));
                }
            };
        });
    }

    private startHeartbeat() {
        this.pingInterval = setInterval(() => {
            this.sendSignaling({
                command: "ping",
                streamId: this.config.streamId
            });
        }, 20000);
    }

    private stopHeartbeat() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    private async initPeerConnection() {
        console.log("[WebRTC] Initializing PeerConnection");
        this.pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        this.localStream?.getTracks().forEach(track => {
            console.log(`[WebRTC] Adding track: ${track.kind}`);

            // Add content hints for optimization
            if (track.kind === 'video') {
                (track as any).contentHint = 'motion'; // Prioritize framerate over detail
            }

            const sender = this.pc?.addTrack(track, this.localStream!);

            // Set degradation preference
            if (sender && track.kind === 'video') {
                const params = sender.getParameters();
                (params as any).degradationPreference = 'maintain-framerate';
                sender.setParameters(params);
            }
        });

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignaling({
                    command: "takeCandidate",
                    streamId: this.config.streamId,
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate
                });
            }
        };

        this.pc.oniceconnectionstatechange = () => {
            console.log("[WebRTC] Connection state:", this.pc?.iceConnectionState);
            if (this.pc?.iceConnectionState === 'connected') {
                console.log("[WebRTC] ICE connected, starting stats interval...");
                this.applyBitrateConstraints();
                this.startStatsInterval();
            } else if (this.pc?.iceConnectionState === 'disconnected' || this.pc?.iceConnectionState === 'failed' || this.pc?.iceConnectionState === 'closed') {
                this.config.onDisconnect?.();
            }
        };

        // 3. Create offer and send takeConfiguration
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        console.log("[WebRTC] Created SDP offer, sending to server");

        this.sendSignaling({
            command: "takeConfiguration",
            streamId: this.config.streamId,
            sdp: offer.sdp,
            type: "offer"
        });
    }

    public async updateConfig(newConfig: Partial<WebRTCConfig>) {
        this.config = { ...this.config, ...newConfig };
        if (this.pc && this.pc.iceConnectionState === 'connected') {
            await this.applyBitrateConstraints();
        }
    }

    private async applyBitrateConstraints() {
        if (!this.pc) return;
        const senders = this.pc.getSenders();
        for (const sender of senders) {
            if (sender.track?.kind === 'video' && (this.config.videoBitrate || this.config.maxFramerate)) {
                const params = sender.getParameters();
                if (!params.encodings) params.encodings = [{}];

                if (this.config.videoBitrate) {
                    params.encodings[0].maxBitrate = this.config.videoBitrate * 1000;
                }

                if (this.config.maxFramerate) {
                    params.encodings[0].maxFramerate = this.config.maxFramerate;
                }

                await sender.setParameters(params);
                console.log(`[WebRTC] Applied video constraints: ${this.config.videoBitrate}kbps, ${this.config.maxFramerate}fps`);
            }
            if (sender.track?.kind === 'audio' && this.config.audioBitrate) {
                const params = sender.getParameters();
                if (!params.encodings) params.encodings = [{}];
                params.encodings[0].maxBitrate = this.config.audioBitrate * 1000;
                await sender.setParameters(params);
                console.log(`[WebRTC] Applied audio bitrate limit: ${this.config.audioBitrate}kbps`);
            }
        }
    }

    private startStatsInterval() {
        this.stopStatsInterval();
        this.statsInterval = setInterval(async () => {
            if (!this.pc || !this.config.onStats) return;

            try {
                const stats = await this.pc.getStats();
                if (!this.lastStats) this.lastStats = {};
                let currentStats: Partial<WebRTCStats> = { timestamp: Date.now() };

                const reportTypes = new Set();
                stats.forEach(r => reportTypes.add(r.type));
                console.log("[WebRTC Stats] Available report types:", Array.from(reportTypes));

                stats.forEach(report => {
                    // 1. Get RTT from remote-inbound-rtp (Standard but sometimes missing)
                    if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
                        console.log("[WebRTC Stats] Found remote-inbound-rtp:", report);
                        if (report.roundTripTime !== undefined) {
                            currentStats.rtt = Math.round(report.roundTripTime * 1000);
                        }
                        currentStats.packetsLost = report.packetsLost || 0;
                    }

                    // 2. Fallback RTT from candidate-pair (Often more reliable in some browsers)
                    if (report.type === 'candidate-pair' && report.state === 'succeeded' && !currentStats.rtt) {
                        if (report.currentRoundTripTime !== undefined) {
                            currentStats.rtt = Math.round(report.currentRoundTripTime * 1000);
                            console.log("[WebRTC Stats] Found RTT from candidate-pair:", currentStats.rtt);
                        }
                    }

                    // 3. Get Bitrate from outbound-rtp
                    if (report.type === 'outbound-rtp' && (report.kind === 'video' || report.mediaType === 'video')) {
                        console.log("[WebRTC Stats] Found outbound-rtp:", report);
                        if (this.lastStats[report.id]) {
                            const lastReport = this.lastStats[report.id];
                            const deltaBytes = report.bytesSent - lastReport.bytesSent;
                            const deltaFrames = (report.framesEncoded || 0) - (lastReport.framesEncoded || 0);
                            const deltaTime = report.timestamp - lastReport.timestamp; // ms
                            
                            if (deltaTime > 0) {
                                if (deltaBytes >= 0) {
                                    // bits/ms = kbps
                                    currentStats.bitrate = Math.round((deltaBytes * 8) / deltaTime); 
                                    console.log("[WebRTC Stats] Calculated Bitrate:", currentStats.bitrate);
                                }
                                if (deltaFrames >= 0) {
                                    currentStats.fps = Math.round((deltaFrames * 1000) / deltaTime);
                                }
                            }
                        }
                        currentStats.framesEncoded = report.framesEncoded;
                        this.lastStats[report.id] = {
                            bytesSent: report.bytesSent,
                            framesEncoded: report.framesEncoded,
                            timestamp: report.timestamp
                        };
                    }
                });

                // Fallback RTT from ActionSync if WebRTC RTT is missing
                if (currentStats.rtt === undefined) {
                    try {
                        const { ActionSyncService } = await import('./ActionSyncService');
                        const socketLatency = ActionSyncService.getLatency();
                        if (socketLatency > 0) {
                            currentStats.rtt = socketLatency;
                            console.log("[WebRTC Stats] Using ActionSync fallback RTT:", socketLatency);
                        }
                    } catch (e) {}
                }

                // Always call onStats if we are in this interval
                this.config.onStats({
                    bitrate: currentStats.bitrate || 0,
                    rtt: currentStats.rtt || 0,
                    packetsLost: currentStats.packetsLost || 0,
                    framesEncoded: currentStats.framesEncoded || 0,
                    fps: currentStats.fps || 0,
                    timestamp: currentStats.timestamp || Date.now()
                });
            } catch (e) {
                console.error("[WebRTC] Stats failed:", e);
            }
        }, 2000);
    }

    private stopStatsInterval() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }

    private sendSignaling(data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    public stop() {
        console.log("[WebRTC] Stopping publisher");
        this.stopHeartbeat();
        this.stopStatsInterval();
        this.sendSignaling({ command: "stop", streamId: this.config.streamId });
        this.ws?.close();
        this.pc?.close();
        this.localStream = null;
        this.pc = null;
        this.ws = null;
    }
}
