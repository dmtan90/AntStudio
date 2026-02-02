export interface WebRTCPlayerConfig {
    websocketUrl: string;
    streamId: string;
    onStream?: (stream: MediaStream) => void;
    onDisconnect?: () => void;
    onStats?: (stats: any) => void;
}

export class WebRTCPlayer {
    private pc: RTCPeerConnection | null = null;
    private ws: WebSocket | null = null;
    private config: WebRTCPlayerConfig;
    public remoteStream: MediaStream | null = null;
    private pingInterval: any = null;
    private iceQueue: RTCIceCandidateInit[] = [];

    constructor(config: WebRTCPlayerConfig) {
        this.config = config;
    }

    async start() {
        console.log(`[WebRTC Player] Starting for stream: ${this.config.streamId}`);
        this.ws = new WebSocket(this.config.websocketUrl);

        return new Promise<void>((resolve, reject) => {
            this.ws!.onopen = () => {
                console.log("[WebRTC Player] Signaling socket opened");
                this.startHeartbeat();
                this.sendSignaling({
                    command: "play",
                    streamId: this.config.streamId,
                    video: true,
                    audio: true
                });
            };

            this.ws!.onerror = (err) => {
                console.warn("[WebRTC Player] Connection failed.");
                reject(err);
            };

            this.ws!.onmessage = async (event) => {
                const msg = JSON.parse(event.data);

                if (msg.command === "takeConfiguration") {
                    if (msg.type === "offer") {
                        await this.initPeerConnection();
                        await this.pc?.setRemoteDescription(new RTCSessionDescription({
                            type: "offer",
                            sdp: msg.sdp
                        }));
                        const answer = await this.pc?.createAnswer();
                        await this.pc?.setLocalDescription(answer!);
                        this.sendSignaling({
                            command: "takeConfiguration",
                            streamId: this.config.streamId,
                            type: "answer",
                            sdp: answer!.sdp
                        });

                        // Process queued candidates
                        while (this.iceQueue.length > 0) {
                            const candidate = this.iceQueue.shift();
                            if (candidate) await this.pc?.addIceCandidate(new RTCIceCandidate(candidate));
                        }
                        resolve();
                    }
                } else if (msg.command === "takeCandidate") {
                    const candidateInfo = {
                        candidate: msg.candidate,
                        sdpMLineIndex: msg.label,
                        sdpMid: msg.id
                    };
                    if (this.pc && this.pc.remoteDescription) {
                        await this.pc.addIceCandidate(new RTCIceCandidate(candidateInfo));
                    } else {
                        this.iceQueue.push(candidateInfo);
                    }
                } else if (msg.command === "notification") {
                    if (msg.definition === "play_started") {
                        console.log("[WebRTC Player] Play started notification received");
                    }
                } else if (msg.command === "error") {
                    console.error("[WebRTC Player] Server error:", msg.definition);
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

    private async initPeerConnection() {
        if (this.pc) return;

        this.pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        this.pc.ontrack = (event) => {
            console.log(`[WebRTC Player] Received track: ${event.track.kind}`);
            // Prefer using the stream from the event if possible
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
            } else if (!this.remoteStream) {
                this.remoteStream = new MediaStream();
                this.remoteStream.addTrack(event.track);
            } else {
                this.remoteStream.addTrack(event.track);
            }

            if (this.config.onStream) {
                this.config.onStream(this.remoteStream);
            }
        };

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
            if (this.pc?.iceConnectionState === 'disconnected' || this.pc?.iceConnectionState === 'failed') {
                this.config.onDisconnect?.();
            }
        };
    }

    private sendSignaling(data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    public stop() {
        console.log("[WebRTC Player] Stopping");
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.sendSignaling({ command: "stop", streamId: this.config.streamId });
        this.ws?.close();
        this.pc?.close();
        this.pc = null;
        this.ws = null;
    }
}
