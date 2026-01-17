export interface Veo3GenerateOptions {
  prompt: string
  duration?: number // in seconds
  aspectRatio?: '16:9' | '9:16' | '1:1'
  imageStart?: string // URL or base64 for first frame
  imageEnd?: string   // URL or base64 for last frame
  characterImages?: string[] // reference character appearance
}

export interface Veo3JobStatus {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number // 0-100
  videoUrl?: string
  error?: string
}

/**
 * Initialize Veo 3 client
 */
export const initializeVeo3 = () => {
  const config = useRuntimeConfig()

  if (!config.geminiApiKey) {
    throw new Error('Google AI API key not configured')
  }

  return {
    apiKey: config.geminiApiKey,
    endpoint: config.veoApiEndpoint || 'https://aiplatform.googleapis.com/v1/veo3'
  }
}

/**
 * Generate video with Veo 3
 * @param options Video generation options
 */
export const generateVideo = async (
  options: Veo3GenerateOptions
): Promise<{ jobId: string }> => {
  const client = initializeVeo3()
  const config = useRuntimeConfig()

  console.log(`🎬 Veo 3 generation: "${options.prompt.substring(0, 50)}..."`)
  console.log(`🖼️ Start Frame: ${options.imageStart ? 'Yes' : 'No'}, End Frame: ${options.imageEnd ? 'Yes' : 'No'}, Characters: ${options.characterImages?.length || 0}`)

  // In real implementation, we would send these to Vertex AI / Google AI
  // For now, if no endpoint is configured, we might still want to use mock
  if (!config.veoApiEndpoint || config.veoApiEndpoint.includes('placeholder')) {
    // Fallback to mock for now but log the advanced parameters
    const { jobId } = await generateMockVideo(options.prompt, options.duration)
    return { jobId }
  }

  // Actual API call placeholder
  const body = {
    prompt: options.prompt,
    duration: options.duration || 5,
    aspect_ratio: options.aspectRatio || '16:9',
    image_start: options.imageStart,
    image_end: options.imageEnd,
    character_references: options.characterImages || []
  }

  try {
    const response = await fetch(`${client.endpoint}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Veo 3 API error: ${err}`)
    }

    const data = await response.json()
    return { jobId: data.jobId || data.job_id }
  } catch (error: any) {
    console.error('Veo 3 API Call failed:', error)
    throw error
  }
}

/**
 * Check video generation status
 */
export const checkVideoStatus = async (jobId: string): Promise<Veo3JobStatus> => {
  const client = initializeVeo3()
  const config = useRuntimeConfig()

  if (jobId.startsWith('mock-')) {
    return { jobId, status: 'completed', videoUrl: 'https://storage.googleapis.com/gweb-tveo-website.appspot.com/short-films/ElectricPink-rollover.mp4' }
  }

  try {
    const response = await fetch(`${client.endpoint}/status/${jobId}`, {
      headers: { 'Authorization': `Bearer ${client.apiKey}` }
    })
    const data = await response.json()
    return {
      jobId,
      status: data.status,
      progress: data.progress,
      videoUrl: data.videoUrl,
      error: data.error
    }
  } catch (error) {
    return { jobId, status: 'failed', error: 'Failed to check status' }
  }
}

/**
 * Download generated video
 */
export const downloadVideo = async (videoUrl: string): Promise<Buffer> => {
  const response = await fetch(videoUrl)
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Utility to get buffer from URL or base64 (useful for API)
 */
export const getFileBuffer = async (input: string): Promise<Buffer> => {
  if (input.startsWith('http')) {
    const res = await fetch(input)
    return Buffer.from(await res.arrayBuffer())
  }
  if (input.startsWith('data:')) {
    const base64 = input.split(',')[1]
    return Buffer.from(base64, 'base64')
  }
  return Buffer.from(input)
}

/**
 * For development: Create a placeholder/mock video generation
 */
export const generateMockVideo = async (
  prompt: string,
  duration: number = 5
): Promise<{ jobId: string; s3Key: string }> => {
  const jobId = `mock-${Date.now()}`
  const mockUrl = `https://storage.googleapis.com/gweb-tveo-website.appspot.com/short-films/ElectricPink-rollover.mp4`

  console.log(`🎬 Mock video generation for: "${prompt.substring(0, 50)}..." (${duration}s)`)

  return { jobId, s3Key: mockUrl }
}
