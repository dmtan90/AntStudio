import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useAIStore } from '../stores/ai'

export function useRecorderAI() {
    const aiStore = useAIStore()
    const isAiActive = ref(false)
    const activeCaptions = ref(false)
    const currentCaption = ref('')
    const translatedCaption = ref('')
    const targetLanguage = ref('vi')
    const aiPresentationData = ref<any>(null)
    const currentSlideIndex = ref(0)
    const isAnalyzing = ref(false)
    const whiteboardScripts = ref<string[]>([])
    const isAIPresenting = ref(false)

    const toggleAI = (enableBeauty: any) => {
        isAiActive.value = !isAiActive.value
        enableBeauty.value = isAiActive.value
        toast(isAiActive.value ? 'AI Enhancement Enabled' : 'AI Enhancement Disabled')
    }

    const generateWhiteboardAIScripts = async (whiteboardPages: any) => {
        if (whiteboardPages.value.length === 0) return
        const toastId = toast.loading('AI is analyzing your slides...')
        try {
            const scripts: string[] = []
            for (let i = 0; i < whiteboardPages.value.length; i++) {
                const bitmap = whiteboardPages.value[i]
                const canvas = document.createElement('canvas')
                canvas.width = bitmap.width; canvas.height = bitmap.height
                const ctx = canvas.getContext('2d')!
                ctx.drawImage(bitmap, 0, 0)
                const base64 = canvas.toDataURL('image/jpeg', 0.8)
                
                const prompt = `You are a professional presenter. Analyze this presentation slide and write a clear, engaging script (approx 2 sentences) for an AI avatar to speak. Return only the script text.`
                const res = await (aiStore as any).analyzeVision(base64, prompt) 
                scripts.push(res.text || `This slide covers technical details of our presentation.`)
                toast.message(`Analyzed slide ${i+1}/${whiteboardPages.value.length}`, { id: toastId })
            }
            whiteboardScripts.value = scripts
            toast.success('AI Scripts Generated!', { id: toastId })
        } catch (err) {
            toast.error('AI Analysis failed', { id: toastId })
        }
    }

    const startAIPresentation = (whiteboardPages: any, mode: any) => {
        if (whiteboardScripts.value.length === 0) {
            toast.error('Please generate scripts first')
            return
        }
        aiPresentationData.value = {
            slides: whiteboardPages.value.map((p: any, i: number) => ({
                 id: i.toString(),
                 image: p,
                 note: whiteboardScripts.value[i] || ""
            }))
        }
        currentSlideIndex.value = 0
        mode.value = 'whiteboard'
        isAIPresenting.value = true
        toast.success('AI Whiteboard Presentation Started')
    }

    const toggleCaptions = () => {
        activeCaptions.value = !activeCaptions.value
        toast(activeCaptions.value ? 'Captions Enabled' : 'Captions Disabled')
        
        if (activeCaptions.value) {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
                const recognition = new SpeechRecognition()
                recognition.continuous = true
                recognition.interimResults = true
                recognition.lang = targetLanguage.value === 'vi' ? 'vi-VN' : 'en-US'
                
                recognition.onresult = (event: any) => {
                    let final = ''
                    let interim = ''
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            final += event.results[i][0].transcript
                        } else {
                            interim += event.results[i][0].transcript
                        }
                    }
                    currentCaption.value = final || interim
                }
                
                recognition.onend = () => {
                    if (activeCaptions.value) recognition.start()
                }
                
                recognition.start();
                (window as any)._recorderRecognition = recognition
            } else {
                toast.error('Speech Recognition not supported in this browser')
                activeCaptions.value = false
            }
        } else {
            if ((window as any)._recorderRecognition) {
                (window as any)._recorderRecognition.stop();
                (window as any)._recorderRecognition = null
            }
            currentCaption.value = ''
        }
    }

    return {
        isAiActive,
        activeCaptions,
        currentCaption,
        translatedCaption,
        targetLanguage,
        aiPresentationData,
        currentSlideIndex,
        isAnalyzing,
        whiteboardScripts,
        isAIPresenting,
        toggleAI,
        generateWhiteboardAIScripts,
        startAIPresentation,
        toggleCaptions
    }
}
