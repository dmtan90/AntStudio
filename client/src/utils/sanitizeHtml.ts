/**
 * Minimal HTML hardening for content rendered with v-html.
 * Use escapeHtml for plain text (AI/chat output) before applying formatting,
 * and sanitizeHtml for content that is expected to carry simple formatting markup.
 */

const ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}

export function escapeHtml(text: string | null | undefined): string {
    if (!text) return ''
    return String(text).replace(/[&<>"']/g, ch => ESCAPES[ch])
}

const ALLOWED_TAGS = new Set([
    'B', 'STRONG', 'I', 'EM', 'U', 'S', 'BR', 'P', 'DIV', 'SPAN', 'UL', 'OL', 'LI',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'CODE', 'PRE', 'BLOCKQUOTE', 'A', 'SMALL', 'SUP', 'SUB', 'HR'
])
const ALLOWED_ATTRS = new Set(['class', 'style', 'href', 'title', 'target', 'rel'])

/** Allowlist sanitizer: keeps basic formatting tags, drops scripts, event handlers and unsafe URLs. */
export function sanitizeHtml(html: string | null | undefined): string {
    if (!html) return ''
    if (typeof DOMParser === 'undefined') return escapeHtml(html)

    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
    const root = doc.body.firstElementChild as HTMLElement | null
    if (!root) return ''

    const walk = (node: Element) => {
        for (const child of Array.from(node.children)) {
            if (!ALLOWED_TAGS.has(child.tagName)) {
                // Keep the text of unknown-but-harmless tags, drop dangerous ones entirely
                if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE', 'NOSCRIPT'].includes(child.tagName)) {
                    child.remove()
                } else {
                    child.replaceWith(doc.createTextNode(child.textContent || ''))
                }
                continue
            }
            for (const attr of Array.from(child.attributes)) {
                const name = attr.name.toLowerCase()
                if (!ALLOWED_ATTRS.has(name)) {
                    child.removeAttribute(attr.name)
                } else if (name === 'href' && !/^(https?:|mailto:|\/(?!\/)|#)/i.test(attr.value.trim())) {
                    child.removeAttribute(attr.name)
                }
            }
            if (child.tagName === 'A') {
                child.setAttribute('rel', 'noopener noreferrer')
            }
            walk(child)
        }
    }
    walk(root)
    return root.innerHTML
}
