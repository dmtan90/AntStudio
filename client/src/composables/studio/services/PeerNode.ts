import { ActionSyncService } from '@/utils/ai/ActionSyncService';

export interface PeerNodeConfig {
    targetId: string;
    onTrack: (event: RTCTrackEvent) => void;
    onNegotiationNeeded?: () => void;
}

export class PeerNode {
    public id: string;
    public pc: RTCPeerConnection;
    private onNegotiationNeededCallback?: () => void;

    constructor(config: PeerNodeConfig) {
        this.id = config.targetId;
        this.onNegotiationNeededCallback = config.onNegotiationNeeded;

        this.pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                ActionSyncService.sendGuestSignal(this.id, {
                    type: 'candidate',
                    candidate: event.candidate
                });
            }
        };

        this.pc.ontrack = config.onTrack;

        // Automatically handle negotiation needed if a callback is provided
        this.pc.onnegotiationneeded = async () => {
            if (this.onNegotiationNeededCallback) {
                this.onNegotiationNeededCallback();
            } else {
                this.renegotiate();
            }
        };
    }

    public addLocalTracks(localStream?: MediaStream | null, canvasStream?: MediaStream | null) {
        // 1. Audio from Microphone
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                this.pc.addTrack(track, localStream);
            });
        }

        // 2. Video Source
        if (canvasStream) {
            console.log(`[PeerNode ${this.id}] Sending Program Feed`);
            canvasStream.getVideoTracks().forEach(track => {
                this.pc.addTrack(track, canvasStream);
            });
        } else if (localStream) {
            console.log(`[PeerNode ${this.id}] Sending Camera Stream`);
            localStream.getVideoTracks().forEach(track => {
                this.pc.addTrack(track, localStream);
            });
        }
    }

    public forwardTracks(stream: MediaStream, shouldForwardVideo: boolean) {
        stream.getTracks().forEach(track => {
            if (track.kind === 'video' && !shouldForwardVideo) return;
            const senders = this.pc.getSenders();
            if (!senders.find(s => s.track === track)) {
                this.pc.addTrack(track, stream);
            }
        });
    }

    public async createAndSendOffer() {
        try {
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
            ActionSyncService.sendGuestSignal(this.id, {
                type: 'offer',
                sdp: offer.sdp
            });
        } catch (err) {
            console.error(`[PeerNode ${this.id}] Failed to create offer:`, err);
        }
    }

    public async handleOffer(sdp: string) {
        if (this.pc.signalingState !== 'stable' && this.pc.signalingState !== 'have-local-offer') {
            console.warn(`[PeerNode ${this.id}] Cannot set remote answer in state: ${this.pc.signalingState}`);
            return;
        }

        try {
            await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);

            ActionSyncService.sendGuestSignal(this.id, {
                type: 'answer',
                sdp: answer.sdp
            });
        } catch (err) {
            console.error(`[PeerNode ${this.id}] SDP negotiation failed:`, err);
        }
    }

    public async handleAnswer(sdp: string) {
        try {
            await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
        } catch (err) {
            console.error(`[PeerNode ${this.id}] Failed to set remote answer:`, err);
        }
    }

    public async handleCandidate(candidate: RTCIceCandidateInit) {
        if (this.pc.remoteDescription) {
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error(`[PeerNode ${this.id}] Failed to add ICE candidate:`, err);
            }
        }
    }

    private async renegotiate() {
        if (this.pc.signalingState !== 'stable') return;
        console.log(`[PeerNode ${this.id}] Auto-renegotiating...`);
        this.createAndSendOffer();
    }

    public close() {
        this.pc.close();
    }
}
