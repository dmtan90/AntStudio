import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// @ts-ignore - pdf-parse has issues with ES modules
const pdf = require('pdf-parse')
import mammoth from 'mammoth'
// @ts-ignore
if (typeof window === 'undefined') {
    (global as any).window = {};
}
const pptxParser = require('pptx-parser')

export interface ParsedDocument {
    text: string
    slides?: string[] // Text per slide/page
    metadata?: {
        title?: string
        author?: string
        pages?: number
    }
}

/**
 * Parse text file
 */
export const parseTxt = async (buffer: Buffer): Promise<ParsedDocument> => {
    const text = buffer.toString('utf-8')
    return { text, slides: [text] }
}

/**
 * Parse PDF file
 */
export const parsePdf = async (buffer: Buffer): Promise<ParsedDocument> => {
    const data = await pdf(buffer)
    // pdf-parse can give us text, but not easily slide-by-slide without more complex logic
    // For now we'll treat the whole text as one, but we could split by form feeds if available
    const slides = data.text.split(/\f/).filter((s: string) => s.trim().length > 0)

    return {
        text: data.text,
        slides: slides.length > 0 ? slides : [data.text],
        metadata: {
            title: data.info?.Title,
            author: data.info?.Author,
            pages: data.numpages
        }
    }
}

/**
 * Parse DOCX file
 */
export const parseDocx = async (buffer: Buffer): Promise<ParsedDocument> => {
    const result = await mammoth.extractRawText({ buffer })
    return {
        text: result.value,
        slides: [result.value]
    }
}

/**
 * Parse PPTX file (improved extraction)
 */
export const parsePptx = async (buffer: Buffer): Promise<ParsedDocument> => {
    try {
        const result = await pptxParser.parse(buffer)
        const slidesText: string[] = []

        if (result && result.slides) {
            result.slides.forEach((slide: any) => {
                let slideText = ''
                if (slide.elements) {
                    slide.elements.forEach((el: any) => {
                        if (el.text) slideText += el.text + ' '
                    })
                }
                slidesText.push(slideText.trim())
            })
        }

        return {
            text: slidesText.join('\n'),
            slides: slidesText,
            metadata: {
                pages: slidesText.length
            }
        }
    } catch (error) {
        console.error('PPTX parse error:', error)
        // Fallback to basic extraction
        const textContent = buffer.toString('utf-8')
        const text = textContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        return { text, slides: [text] }
    }
}

/**
 * Main document parser
 */
export const parseDocument = async (
    buffer: Buffer,
    fileType: 'txt' | 'pdf' | 'docx' | 'pptx'
): Promise<ParsedDocument> => {
    switch (fileType) {
        case 'txt':
            return parseTxt(buffer)
        case 'pdf':
            return parsePdf(buffer)
        case 'docx':
            return parseDocx(buffer)
        case 'pptx':
            return parsePptx(buffer)
        default:
            throw new Error(`Unsupported file type: ${fileType}`)
    }
}
