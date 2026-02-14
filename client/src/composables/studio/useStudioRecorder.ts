import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/project'
import api from '@/utils/api'
import { toast } from 'vue-sonner'

export function useStudioRecorder() {
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const recordedChunks = ref<Blob[]>([])
  const isRecording = ref(false)
  const isPaused = ref(false)
  const recordingTime = ref(0)
  const timerInterval = ref<any>(null)
  const recordedBlob = ref<Blob | null>(null)
  const recordedUrl = ref<string | null>(null)
  const isSaving = ref(false)

  const projectStore = useProjectStore()

  const startRecording = (stream: MediaStream) => {
    if (!stream) {
      toast.error('No stream to record')
      return
    }

    try {
      // Use a supportive mime type
      const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? { mimeType: 'video/webm;codecs=vp9' }
        : MediaRecorder.isTypeSupported('video/webm')
          ? { mimeType: 'video/webm' }
          : { mimeType: 'video/mp4' }

      mediaRecorder.value = new MediaRecorder(stream, options)
      recordedChunks.value = []

      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.value.push(event.data)
        }
      }

      mediaRecorder.value.onstop = () => {
        const mimeType = mediaRecorder.value?.mimeType || 'video/webm'
        recordedBlob.value = new Blob(recordedChunks.value, { type: mimeType })
        recordedUrl.value = URL.createObjectURL(recordedBlob.value)
        cleanup()
      }

      mediaRecorder.value.start(1000) // Collect chunks every second
      isRecording.value = true
      isPaused.value = false
      startTimer()

    } catch (error: any) {
      console.error('Failed to start recording:', error)
      toast.error('Failed to start recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.value && isRecording.value) {
      mediaRecorder.value.stop()
      isRecording.value = false
      isPaused.value = false
      stopTimer()
    }
  }

  const pauseRecording = () => {
    if (mediaRecorder.value && isRecording.value && !isPaused.value) {
      mediaRecorder.value.pause()
      isPaused.value = true
      stopTimer()
    }
  }

  const resumeRecording = () => {
    if (mediaRecorder.value && isRecording.value && isPaused.value) {
      mediaRecorder.value.resume()
      isPaused.value = false
      startTimer()
    }
  }

  const startTimer = () => {
    stopTimer()
    timerInterval.value = setInterval(() => {
      recordingTime.value++
    }, 1000)
  }

  const stopTimer = () => {
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
      timerInterval.value = null
    }
  }

  const cleanup = () => {
    stopTimer()
    // Don't revoke object URL immediately, need it for preview
  }

  const reset = () => {
    if (recordedUrl.value) {
      URL.revokeObjectURL(recordedUrl.value)
    }
    recordedBlob.value = null
    recordedUrl.value = null
    recordedChunks.value = []
    recordingTime.value = 0
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Defines logic to save recording to the gallery.
   * If projectId is provided, saves to that project.
   * If not, creates a new "Live Stream" project and saves there.
   */
  const saveToGallery = async (currentProjectId?: string) => {
    if (!recordedBlob.value) return

    isSaving.value = true
    try {
      let projectId = currentProjectId

      // 1. Create Project if needed
      if (!projectId) {
        const title = `Live Stream - ${new Date().toLocaleString()}`
        const { data } = await api.post('/projects', {
          title,
          description: 'Recorded live session',
          mode: 'livestream', // Uses new mode
          videoStyle: 'realistic'
        })
        projectId = data.data.project._id
        
        // Refresh project list store if needed
        // projectStore.fetchProjects() 
      }

      // 2. Upload Asset
      const formData = new FormData()
      // Determine extension from mimeType
      const ext = recordedBlob.value.type.includes('mp4') ? 'mp4' : 'webm'
      const filename = `recording_${Date.now()}.${ext}`
      
      formData.append('file', recordedBlob.value, filename)
      formData.append('description', 'Live Stream Recording')
      // No entityType needed for generic asset update

      const { data: uploadData } = await api.post(`/projects/${projectId}/assets/upload`, formData)
      
      toast.success('Recording saved to Project Gallery')
      return { projectId, s3Key: uploadData.data.s3Key }
    } catch (error: any) {
      console.error('Failed to save recording:', error)
      toast.error('Failed to save recording')
      throw error
    } finally {
      isSaving.value = false
    }
  }

  return {
    isRecording,
    isPaused,
    recordingTime,
    recordedUrl,
    recordedBlob,
    isSaving,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
    formatTime,
    saveToGallery
  }
}
