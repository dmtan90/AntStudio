export interface WebRTCConfig {
    websocketUrl: string;
    streamId: string;
}

export class WebRTCPublisher {
    private pc: RTCPeerConnection | null = null;
    private ws: WebSocket | null = null;
    private config: WebRTCConfig;
    private localStream: MediaStream | null = null;

    constructor(config: WebRTCConfig) {
        this.config = config;
    }

    /**
     * Start publishing a stream
     */
    async start(stream: MediaStream) {
        this.localStream = stream;
        this.ws = new WebSocket(this.config.websocketUrl);

        this.ws.onopen = () => {
            console.log("[WebRTC] Signaling socket opened");
            this.initPeerConnection();
        };

        this.ws.onmessage = async (event) => {
            const msg = JSON.parse(event.data);
            if (msg.command === "takeConfiguration") {
                await this.pc?.setRemoteDescription(new RTCSessionDescription({
                    type: "answer",
                    sdp: msg.sdp
                }));
            } else if (msg.command === "takeCandidate") {
                await this.pc?.addIceCandidate(new RTCIceCandidate({
                    candidate: msg.candidate,
                    sdpMLineIndex: msg.label,
                    sdpMid: msg.id
                }));
            }
        };
    }

    private async initPeerConnection() {
        this.pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        this.localStream?.getTracks().forEach(track => {
            this.pc?.addTrack(track, this.localStream!);
        });

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignaling({
                    command: "takeCandidate",
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate
                });
            }
        };

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        this.sendSignaling({
            command: "publish",
            streamId: this.config.streamId,
            sdp: offer.sdp,
            video: true,
            audio: true
        });
    }

    private sendSignaling(data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    stop() {
        this.sendSignaling({ command: "stop", streamId: this.config.streamId });
        this.pc?.close();
        this.ws?.close();
        this.pc = null;
        this.ws = null;
    }
}
