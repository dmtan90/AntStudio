import { ref } from 'vue';
import { Face, Pose, Hand } from 'kalidokit';

export const useVTuberTracking = () => {
    const riggedData = ref<any>(null);

    /**
     * Solve MediaPipe landmarks using KalidoKit
     */
    const solveLandmarks = (results: any, videoElement: HTMLVideoElement | HTMLCanvasElement) => {
        if (!results) return null;

        const { faceLandmarks, poseWorldLandmarks, poseLandmarks, handLandmarks } = results;

        let faceRig: any = null;
        let poseRig: any = null;
        let leftHandRig: any = null;
        let rightHandRig: any = null;

        // 1. Solve Face
        if (faceLandmarks && faceLandmarks.length > 0) {
            faceRig = Face.solve(faceLandmarks[0], {
                runtime: 'mediapipe',
                video: videoElement as any,
                imageSize: { width: videoElement.width || 640, height: videoElement.height || 480 }
            });
        }

        // 2. Solve Pose
        if (poseLandmarks && poseWorldLandmarks) {
            poseRig = Pose.solve(poseWorldLandmarks, poseLandmarks, {
                runtime: 'mediapipe',
                video: videoElement as any,
                imageSize: { width: videoElement.width || 640, height: videoElement.height || 480 }
            });
        }

        // 3. Solve Hands
        // MediaPipe HandLandmarker returns an array of hands. 
        // We need to identify Left vs Right or just iterate.
        if (handLandmarks && handLandmarks.length > 0) {
            // Simplification: just take the first two hands
            rightHandRig = Hand.solve(handLandmarks[0], "Right");
            if (handLandmarks.length > 1) {
                leftHandRig = Hand.solve(handLandmarks[1], "Left");
            }
        }

        riggedData.value = {
            face: faceRig,
            pose: poseRig,
            leftHand: leftHandRig,
            rightHand: rightHandRig
        };

        return riggedData.value;
    };

    return {
        riggedData,
        solveLandmarks
    };
};
