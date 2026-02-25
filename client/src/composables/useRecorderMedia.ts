import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'

export function useRecorderMedia() {
    const currentStream = ref<MediaStream | null>(null)
    const secondaryStream = ref<MediaStream | null>(null)
    const videoDevices = ref<MediaDeviceInfo[]>([])
    const audioDevices = ref<MediaDeviceInfo[]>([])
    const selectedCameraId = ref<string | null>(null)
    const selectedMicId = ref<string | null>(null)
    const isScreenShareEnded = ref(false)
    
    const recordingQuality = ref({
        resolution: '1080p',
        fps: 30
    })

    const enumerateDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            videoDevices.value = devices.filter(d => d.kind === 'videoinput')
            audioDevices.value = devices.filter(d => d.kind === 'audioinput')
            
            if (!selectedCameraId.value && videoDevices.value.length) {
                selectedCameraId.value = videoDevices.value[0].deviceId
            }
            if (!selectedMicId.value && audioDevices.value.length) {
                selectedMicId.value = audioDevices.value[0].deviceId
            }
        } catch (e) {
            console.error('Failed to enumerate devices:', e)
        }
    }

    const stopAllTracks = (stream: MediaStream | null) => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
        }
    }

    return {
        currentStream,
        secondaryStream,
        videoDevices,
        audioDevices,
        selectedCameraId,
        selectedMicId,
        isScreenShareEnded,
        recordingQuality,
        enumerateDevices,
        stopAllTracks
    }
}
