import { ref, nextTick } from 'vue'
import { toast } from 'vue-sonner'
import { useProjectStore } from '@/stores/project'
import { useTranslations } from '@/composables/useTranslations'

export function useProjectChat(projectId: string, chatContainerRef: any) {
    const projectStore = useProjectStore()
    const { t } = useTranslations()

    const processing = ref(false)
    const statusMessage = ref(t('projects.new.flow.analyzing'))
    const quickSuggestions = ref<string[]>([])
    const currentStage = ref('planning_confirmed')
    const inputMessage = ref('')
    const localMessages = ref<any[]>([])

    const formatContent = (text: string) => {
        if (!text) return ''
        return text.replace(/\n/g, '<br/>')
    }

    const scrollToBottom = () => {
        nextTick(() => {
            if (chatContainerRef.value) {
                chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
            }
        })
    }

    const generateVisualStrategy = async () => {
        try {
            const result = await projectStore.generateVisualPlan(projectId)

            if (result.assets) {
                if (!projectStore.currentProject.visualAssets) projectStore.currentProject.visualAssets = []

                result.assets.forEach((a: any) => {
                    if (!projectStore.currentProject.visualAssets.some((exist: any) => exist.name === a.name)) {
                        projectStore.currentProject.visualAssets.push(a)
                    }
                    projectStore.syncAssetToElements(a.name, a.s3Key)
                })

                await projectStore.updateProject({
                    visualAssets: projectStore.currentProject.visualAssets,
                    scriptAnalysis: projectStore.currentProject.scriptAnalysis,
                    storyboard: projectStore.currentProject.storyboard
                })
            }

            if (projectStore.currentProject) {
                projectStore.currentProject.chatHistory.push({
                    author: 'ai',
                    type: 'visual-path',
                    result: {
                        path: {
                            steps: result.plan_steps
                        }
                    },
                    timestamp: new Date()
                })
            }
            scrollToBottom()

            setTimeout(() => {
                if (projectStore.currentProject) {
                    projectStore.currentProject.chatHistory.push({
                        author: 'ai',
                        type: 'visual-assets',
                        result: {
                            assets: result.assets
                        },
                        timestamp: new Date()
                    })
                }

                // Localized Suggestions
                quickSuggestions.value = [
                    t('projects.editor.storyboard.suggestions.generateFrames'),
                    t('projects.editor.storyboard.suggestions.generateMotion'),
                    t('projects.editor.storyboard.suggestions.generateAudio')
                ]

                scrollToBottom()
            }, 2000)

        } catch (error) {
            console.error('Failed to generate visual plan', error)
            toast.error(t('projects.editor.chat.visualStrategyFailed'))
        } finally {
            processing.value = false
        }
    }

    const handleSendMessage = async (payload?: any) => {
        let msgContent = inputMessage.value
        if (typeof payload === 'string') {
            msgContent = payload
        }

        if (!msgContent.trim()) return

        const messages = projectStore.currentProject?.chatHistory || []
        const lastMsg = messages[messages.length - 1]

        // Add user message locally
        if (projectStore.currentProject) {
            if (!projectStore.currentProject.chatHistory) projectStore.currentProject.chatHistory = []
            projectStore.currentProject.chatHistory.push({
                author: 'user',
                content: msgContent,
                timestamp: new Date()
            })
        }

        inputMessage.value = ''
        processing.value = true
        quickSuggestions.value = []
        scrollToBottom()

        try {
            const lowerMsg = msgContent.toLowerCase()

            // Command detection (Language agnostic keywords)
            const keywords = ['start', 'ok', 'yes', 'bắt đầu', 'được', 'triển', 'tiếp']
            const isStartCommand = keywords.some(k => lowerMsg.includes(k)) && lastMsg?.type == "visual-guide"

            if (isStartCommand || lowerMsg.includes('visual plan') || lowerMsg.includes('generate plan')) {
                if (currentStage.value === 'planning_confirmed' || isStartCommand) {
                    await generateVisualStrategy()
                    return
                }
            }

            await projectStore.chat(projectId, msgContent)

        } catch (error) {
            console.error('Chat API Error', error)
            if (projectStore.currentProject) {
                projectStore.currentProject.chatHistory.push({
                    author: 'ai',
                    content: t('projects.editor.chat.error'),
                    type: 'text',
                    timestamp: new Date()
                })
            }
        } finally {
            processing.value = false
            scrollToBottom()
        }
    }

    const handleApplySuggestion = (sug: string) => {
        handleSendMessage(sug)
    }

    return {
        processing,
        statusMessage,
        quickSuggestions,
        inputMessage,
        localMessages,
        formatContent,
        scrollToBottom,
        handleSendMessage,
        handleApplySuggestion
    }
}
