export interface LowerThirdConfig {
    text: string
    subtitle?: string
    style: 'default' | 'minimal' | 'bold' | 'gradient'
    position: 'bottom-left' | 'bottom-center' | 'bottom-right'
    width: number
    height: number
    animation?: 'fade' | 'slide' | 'none'
    animationProgress?: number // 0-1 for fade in/out
}

/**
 * Renders a lower-third graphic overlay to a canvas context
 */
export function renderLowerThird(
    ctx: CanvasRenderingContext2D,
    config: LowerThirdConfig
): void {
    const { text, subtitle, style, position, width, height, animationProgress = 1 } = config

    ctx.save()

    // Calculate position
    const barWidth = Math.min(600, width * 0.4)
    const barHeight = subtitle ? 100 : 70
    const margin = 50
    const yPos = height - margin - barHeight

    let xPos = margin
    if (position === 'bottom-center') {
        xPos = (width - barWidth) / 2
    } else if (position === 'bottom-right') {
        xPos = width - margin - barWidth
    }

    // Apply animation
    if (config.animation === 'fade') {
        ctx.globalAlpha = animationProgress
    } else if (config.animation === 'slide') {
        xPos -= (1 - animationProgress) * 100
    }

    ctx.translate(xPos, yPos)

    // Render based on style
    switch (style) {
        case 'default':
            renderDefaultStyle(ctx, text, subtitle, barWidth, barHeight)
            break
        case 'minimal':
            renderMinimalStyle(ctx, text, subtitle, barWidth, barHeight)
            break
        case 'bold':
            renderBoldStyle(ctx, text, subtitle, barWidth, barHeight)
            break
        case 'gradient':
            renderGradientStyle(ctx, text, subtitle, barWidth, barHeight)
            break
    }

    ctx.restore()
}

function renderDefaultStyle(
    ctx: CanvasRenderingContext2D,
    text: string,
    subtitle: string | undefined,
    width: number,
    height: number
) {
    // Glassmorphic background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, width, height)

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, width, height)

    // Accent bar
    ctx.fillStyle = '#3b82f6'
    ctx.fillRect(0, 0, 6, height)

    // Text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px Inter, sans-serif'
    ctx.fillText(text, 20, subtitle ? 35 : height / 2 + 8)

    if (subtitle) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.font = '16px Inter, sans-serif'
        ctx.fillText(subtitle, 20, 65)
    }
}

function renderMinimalStyle(
    ctx: CanvasRenderingContext2D,
    text: string,
    subtitle: string | undefined,
    width: number,
    height: number
) {
    // No background - just text with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px Inter, sans-serif'
    ctx.fillText(text, 10, subtitle ? 30 : height / 2 + 10)

    if (subtitle) {
        ctx.font = '18px Inter, sans-serif'
        ctx.fillText(subtitle, 10, 60)
    }

    ctx.shadowColor = 'transparent'
}

function renderBoldStyle(
    ctx: CanvasRenderingContext2D,
    text: string,
    subtitle: string | undefined,
    width: number,
    height: number
) {
    // Solid colored background
    ctx.fillStyle = '#3b82f6'
    ctx.fillRect(0, 0, width, height)

    // Text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px Inter, sans-serif'
    ctx.fillText(text, 20, subtitle ? 38 : height / 2 + 10)

    if (subtitle) {
        ctx.font = 'bold 16px Inter, sans-serif'
        ctx.fillText(subtitle, 20, 68)
    }
}

function renderGradientStyle(
    ctx: CanvasRenderingContext2D,
    text: string,
    subtitle: string | undefined,
    width: number,
    height: number
) {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, '#3b82f6')
    gradient.addColorStop(1, '#8b5cf6')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 26px Inter, sans-serif'
    ctx.fillText(text, 20, subtitle ? 36 : height / 2 + 9)

    if (subtitle) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.font = '17px Inter, sans-serif'
        ctx.fillText(subtitle, 20, 66)
    }
}

/**
 * Generates a PNG blob of a lower-third graphic
 * Useful for pre-rendering overlays for video export
 */
export async function generateLowerThirdPNG(
    config: LowerThirdConfig
): Promise<Blob> {
    const canvas = document.createElement('canvas')
    canvas.width = config.width
    canvas.height = config.height

    const ctx = canvas.getContext('2d')!
    renderLowerThird(ctx, config)

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob)
            } else {
                reject(new Error('Failed to generate PNG'))
            }
        }, 'image/png')
    })
}

/**
 * Calculate animation progress based on time
 */
export function calculateAnimationProgress(
    currentTime: number,
    startTime: number,
    duration: number,
    fadeInDuration: number = 0.3,
    fadeOutDuration: number = 0.3
): number {
    const relativeTime = currentTime - startTime
    const endTime = startTime + duration

    // Fade in
    if (relativeTime < fadeInDuration) {
        return relativeTime / fadeInDuration
    }

    // Fade out
    if (currentTime > endTime - fadeOutDuration) {
        return (endTime - currentTime) / fadeOutDuration
    }

    // Full visibility
    return 1
}
