import process from 'process';

const BRAILLE = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
const ASCII = '|/-\\';

const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const CLEAR_LINE = '\x1b[2K\r';

const FRAME_INTERVAL = 125; // 8 Hz
const PROMPT_SNIPPET_MAX = 80;

function fmtElapsed(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    if (s < 60) return `${String(s).padStart(2, '0')}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m < 60) return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}:${String(rm).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function truncate(text: string, limit: number): string {
    const cleaned = text.replace(/\n/g, ' ').trim();
    if (cleaned.length <= limit) return cleaned;
    return cleaned.slice(0, limit - 1).trimEnd() + '…';
}

export class Spinner {
    private isTty: boolean;
    private frames: string;
    private timer: any = null;
    private cursorHidden = false;
    private active = false;
    private startTime = 0;
    private label = '';
    private status = '';
    private progressPct: number | null = null;
    private message: string | null = null;
    private frameIdx = 0;

    constructor() {
        this.isTty = Boolean(process.stderr && process.stderr.isTTY);
        this.frames = this.isTty ? BRAILLE : ASCII;
    }

    public start(): void {
        if (this.timer || !this.isTty) return;
        try {
            process.stderr.write(HIDE_CURSOR);
            this.cursorHidden = true;
        } catch (_) {}

        this.timer = setInterval(() => this.render(), FRAME_INTERVAL);
    }

    public stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.active) {
            this.write(CLEAR_LINE);
            this.active = false;
        }
        if (this.cursorHidden) {
            try {
                process.stderr.write(SHOW_CURSOR);
            } catch (_) {}
            this.cursorHidden = false;
        }
    }

    public stepStarting(
        provider: string,
        model: string,
        prompt?: string,
        stepIndex?: number,
        total?: number
    ): void {
        const label = `${provider}:${model}`.replace(/^:|:$/g, '') || 'generating';
        const mark = this.isTty ? '▶' : '>';
        let counter = '';
        if (stepIndex !== undefined && total !== undefined && total > 1) {
            counter = ` [${stepIndex + 1}/${total}]`;
        }
        let line = `${mark}${counter} ${label}`;
        if (prompt) {
            line += ` · "${truncate(prompt, PROMPT_SNIPPET_MAX)}"`;
        }

        this.write(`${CLEAR_LINE}${line}\n`);
        this.label = label;
        this.status = 'submitted';
        this.progressPct = null;
        this.message = null;
        this.startTime = Date.now();
        this.active = true;
    }

    public stepDone(ok: boolean): void {
        if (!this.active) return;
        const elapsed = fmtElapsed((Date.now() - this.startTime) / 1000);
        const mark = this.isTty ? (ok ? '✓' : '✗') : (ok ? 'OK' : 'FAIL');
        const line = `  ${mark} ${this.label} · ${elapsed}`;
        this.write(`${CLEAR_LINE}${line}\n`);
        this.active = false;
    }

    public updateProgress(event: { status?: string; progressPct?: number; message?: string }): void {
        if (!this.active) return;
        if (event.status) this.status = event.status;
        if (event.progressPct !== undefined) this.progressPct = event.progressPct;
        if (event.message) this.message = event.message;
    }

    private render(): void {
        if (!this.active || !this.isTty) return;
        const frame = this.frames[this.frameIdx % this.frames.length];
        const elapsed = fmtElapsed((Date.now() - this.startTime) / 1000);
        const parts = [`  ${frame} ${this.label}`, this.status, elapsed];
        if (this.progressPct !== null && this.progressPct !== undefined) {
            parts.push(`${Math.floor(this.progressPct * 100)}%`);
        }
        if (this.message) {
            parts.push(truncate(this.message, 40));
        }
        const line = parts.join(' · ');
        this.write(CLEAR_LINE + line);
        this.frameIdx++;
    }

    private write(text: string): void {
        try {
            process.stderr.write(text);
        } catch (_) {}
    }
}
