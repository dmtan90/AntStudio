import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useMediaStore } from '../stores/media'

export function useRecorderRecording() {
    const isRecording = ref(false)
    const recordingTime = ref(0)
    const maxDuration = ref(600)
    const recordedChunks = ref<Blob[]>([])
    const mediaRecorder = ref<any>(null)
    const recordedVideoUrl = ref<string | null>(null)
    const showFinishDialog = ref(false)
    const isCountdownActive = ref(false)
    const countdownValue = ref(3)
    let timer: any = null

    const mediaStore = useMediaStore()

    const startRecording = (processingCanvas: any, audioContext: any, masterDestination: any, currentStream: any) => {
        const s = processingCanvas.value?.captureStream(30)
        if (!s) return
        
        if (audioContext && masterDestination) {
            const track = masterDestination().stream.getAudioTracks()[0]
            if (track) s.addTrack(track)
        } else if (currentStream.value) { 
            currentStream.value.getAudioTracks().forEach((t: any) => s.addTrack(t)) 
        }

        recordedChunks.value = []
        mediaRecorder.value = new (window as any).MediaRecorder(s, { mimeType: 'video/webm;codecs=vp9,opus' })
        
        mediaRecorder.value.ondataavailable = (e: any) => { 
            if (e.data.size > 0) recordedChunks.value.push(e.data) 
        }
        
        mediaRecorder.value.onstop = () => { 
            recordedVideoUrl.value = URL.createObjectURL(new Blob(recordedChunks.value, { type: 'video/webm' }))
            showFinishDialog.value = true 
        }
        
        mediaRecorder.value.start()
        isRecording.value = true
        recordingTime.value = 0
        
        timer = setInterval(() => { 
            recordingTime.value++
            if (recordingTime.value >= maxDuration.value) stopRecording() 
        }, 1000)
    }

    const stopRecording = () => {
        if (mediaRecorder.value && isRecording.value) { 
            mediaRecorder.value.stop()
            isRecording.value = false
            clearInterval(timer)
            window.speechSynthesis.cancel() 
        }
    }

    const downloadRecording = () => {
        if (!recordedVideoUrl.value) return
        const a = document.createElement('a')
        a.href = recordedVideoUrl.value
        a.download = `recording-${Date.now()}.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    const saveToProject = async () => {
        if (!recordedVideoUrl.value) return
        try {
            const blob = await fetch(recordedVideoUrl.value).then(r => r.blob())
            const formData = new FormData()
            formData.append('file', blob, `rec-${Date.now()}.webm`)
            formData.append('purpose', 'recording')
            
            const res = await mediaStore.uploadMedia(formData)
            toast.success('Saved to project assets')
            showFinishDialog.value = false
            return res.media
        } catch (e) {
            console.error(e)
            toast.error('Failed to save')
        }
    }

    return {
        isRecording,
        recordingTime,
        maxDuration,
        recordedVideoUrl,
        showFinishDialog,
        isCountdownActive,
        countdownValue,
        startRecording,
        stopRecording,
        downloadRecording,
        saveToProject
    }
}
