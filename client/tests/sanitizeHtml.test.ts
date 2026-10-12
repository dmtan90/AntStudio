import { describe, expect, it } from 'vitest'
import { escapeHtml, sanitizeHtml } from '@/utils/sanitizeHtml'

describe('escapeHtml', () => {
    it('escapes markup characters', () => {
        expect(escapeHtml(`<img src=x onerror="alert('1')">&`)).toBe('&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;')
    })

    it('handles empty values', () => {
        expect(escapeHtml(null)).toBe('')
        expect(escapeHtml(undefined)).toBe('')
    })
})

describe('sanitizeHtml', () => {
    it('keeps basic formatting', () => {
        const html = '<b>Bold</b> <em>it</em><br><ol style="margin: 5px 0"><li><strong>Step</strong></li></ol>'
        const out = sanitizeHtml(html)
        expect(out).toContain('<b>Bold</b>')
        expect(out).toContain('<em>it</em>')
        expect(out).toContain('<ol style="margin: 5px 0"><li><strong>Step</strong></li></ol>')
    })

    it('removes scripts and dangerous containers entirely', () => {
        const out = sanitizeHtml('hi<script>alert(1)</script><iframe></iframe><svg onload="alert(1)"></svg>')
        expect(out).toBe('hi')
    })

    it('strips event handler attributes', () => {
        const out = sanitizeHtml('<span onclick="alert(1)" onmouseover="x()">t</span>')
        expect(out).toBe('<span>t</span>')
    })

    it('replaces unknown tags with their text', () => {
        expect(sanitizeHtml('<img src=x onerror="alert(1)">caption<marquee>m</marquee>')).toBe('captionm')
    })

    it('drops javascript: and protocol-relative links but keeps safe ones', () => {
        expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a rel="noopener noreferrer">x</a>')
        expect(sanitizeHtml('<a href="//evil.com">x</a>')).toBe('<a rel="noopener noreferrer">x</a>')
        expect(sanitizeHtml('<a href="https://antstudio.app/docs">x</a>')).toBe('<a href="https://antstudio.app/docs" rel="noopener noreferrer">x</a>')
        expect(sanitizeHtml('<a href="/pricing">x</a>')).toBe('<a href="/pricing" rel="noopener noreferrer">x</a>')
    })

    it('sanitizes nested content', () => {
        expect(sanitizeHtml('<div><p><b onclick="x">a</b><script>1</script></p></div>')).toBe('<div><p><b>a</b></p></div>')
    })
})
