import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// @ts-ignore - pdf-parse has issues with ES modules
const pdf = require('pdf-parse')
import mammoth from 'mammoth'

export interface ParsedDocument {
    text: string
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
    return { text }
}

/**
 * Parse PDF file
 */
export const parsePdf = async (buffer: Buffer): Promise<ParsedDocument> => {
    const data = await pdf(buffer)
    return {
        text: data.text,
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
        text: result.value
    }
}

/**
 * Parse PPTX file (basic text extraction)
 */
export const parsePptx = async (buffer: Buffer): Promise<ParsedDocument> => {
    // For PPTX, we'll use a simple approach
    // In production, you might want to use a more sophisticated library
    // For now, convert to string and extract text patterns
    try {
        const textContent = buffer.toString('utf-8')
        // Basic extraction - this is simplified
        // A better approach would use a dedicated PPTX parser
        const text = textContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        return { text }
    } catch (error) {
        throw new Error('Failed to parse PPTX file')
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
