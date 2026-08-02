/** PromptTemplate — reusable prompt with {variable} placeholders. 1:1 port of models/prompt_template.py */

const MAX_TEMPLATE_FIELD_LENGTH = 256;

function unescapeLiteralBraces(text: string): string {
    return text.replace(/\{\{/g, '{').replace(/\}\}/g, '}');
}

function looksLikeFieldStart(char: string): boolean {
    return char === '_' || /[a-zA-Z]/.test(char);
}

function isIdentifier(s: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s);
}

/** Parse a field name from the content between braces. Returns field name or null if invalid. */
function parseFieldName(field: string): string | null {
    if (field.length > MAX_TEMPLATE_FIELD_LENGTH) return null;
    const name = field.split(':')[0].split('!')[0].trim();
    if (!isIdentifier(name)) return null;
    return name;
}

interface TemplatePart {
    kind: 'literal' | 'field';
    value: string;
}

function iterTemplateParts(template: string): TemplatePart[] {
    const parts: TemplatePart[] = [];
    let cursor = 0;
    let index = 0;

    while (index < template.length) {
        const char = template[index];
        if (char === '{') {
            if (index + 1 < template.length && template[index + 1] === '{') {
                index += 2;
                continue;
            }
            if (index + 1 < template.length && looksLikeFieldStart(template[index + 1])) {
                const end = template.indexOf('}', index + 1);
                if (end === -1) {
                    index++;
                    continue;
                }
                const field = template.slice(index + 1, end);
                const fieldName = parseFieldName(field);
                if (fieldName) {
                    parts.push({ kind: 'literal', value: unescapeLiteralBraces(template.slice(cursor, index)) });
                    parts.push({ kind: 'field', value: field });
                    index = end + 1;
                    cursor = index;
                    continue;
                }
            }
        }
        index++;
    }

    parts.push({ kind: 'literal', value: unescapeLiteralBraces(template.slice(cursor)) });
    return parts;
}

export class PromptTemplate {
    readonly template: string;

    constructor(template: string) {
        this.template = template;
    }

    get variables(): Set<string> {
        const vars = new Set<string>();
        for (const part of iterTemplateParts(this.template)) {
            if (part.kind === 'field') {
                const name = parseFieldName(part.value);
                if (name) vars.add(name);
            }
        }
        return vars;
    }

    render(kwargs: Record<string, any>): string {
        const required = this.variables;
        const missing = [...required].filter(v => !(v in kwargs));
        if (missing.length > 0) {
            throw new Error(`Missing template variables: ${missing.sort().join(', ')}`);
        }

        const parts: string[] = [];
        for (const part of iterTemplateParts(this.template)) {
            if (part.kind === 'literal') {
                parts.push(part.value);
            } else {
                const name = parseFieldName(part.value)!;
                const fmt = part.value.slice(name.length);
                const value = kwargs[name];
                parts.push(String(value));
            }
        }
        return parts.join('');
    }
}
