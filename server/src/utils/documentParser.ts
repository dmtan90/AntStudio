// import { createRequire } from 'module'
// const require = createRequire(import.meta.url)
import { fileURLToPath } from 'url'
import path from 'path'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import * as pkgPptxtojson from 'pptxtojson'
// @ts-ignore
const parsePptxImport = pkgPptxtojson.parse || (pkgPptxtojson as any).default?.parse

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const parser = new PDFParse({ data: buffer })
    const data = await parser.getText()
    const infoResult = await parser.getInfo()
    
    // Split by form feeds for slides
    const slides = data.text.split(/\f/).filter((s: string) => s.trim().length > 0)

    return {
        text: data.text,
        slides: slides.length > 0 ? slides : [data.text],
        metadata: {
            title: infoResult.info?.Title,
            author: infoResult.info?.Author,
            pages: data.total
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
 * Parse PPTX file using pptist-import-pptx
 */
export const parsePptx = async (buffer: Buffer): Promise<ParsedDocument> => {
    try {
        // @ts-ignore
        const result = await parsePptxImport(buffer)
        const slidesText: string[] = []

        if (result && result.slides) {
            result.slides.forEach((slide: any) => {
                let slideText = ''
                if (slide.elements) {
                    slide.elements.forEach((el: any) => {
                        // Element structure in pptist-import-pptx might differ
                        // Usually it has a 'content' or 'text' property for text boxes
                        if (el.content) slideText += el.content + ' '
                        else if (el.text) slideText += el.text + ' '
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
        return { text: '', slides: [] }
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
