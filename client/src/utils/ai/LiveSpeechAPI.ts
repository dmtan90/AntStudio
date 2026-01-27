export interface SpeechResult {
    text: string;
    isFinal: boolean;
    confidence: number;
}

export class LiveSpeechAPI {
    private recognition: any = null;
    private isListening: boolean = false;
    private onResultCallback: (result: SpeechResult) => void = () => { };

    constructor(lang: string = 'en-US') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = lang;

            this.recognition.onresult = (event: any) => {
                const lastResult = event.results[event.results.length - 1];
                const text = lastResult[0].transcript;
                this.onResultCallback({
                    text,
                    isFinal: lastResult.isFinal,
                    confidence: lastResult[0].confidence
                });
            };

            this.recognition.onerror = (event: any) => {
                console.error("[SpeechAPI] Error identified:", event.error);
                if (this.isListening && event.error !== 'no-speech') {
                    this.restart();
                }
            };

            this.recognition.onend = () => {
                if (this.isListening) {
                    this.recognition.start();
                }
            };
        }
    }

    public setLanguage(lang: string) {
        if (this.recognition) {
            const wasListening = this.isListening;
            this.stop();
            this.recognition.lang = lang;
            if (wasListening) this.start();
        }
    }

    public onResult(callback: (result: SpeechResult) => void) {
        this.onResultCallback = callback;
    }

    public start() {
        if (this.recognition && !this.isListening) {
            this.recognition.start();
            this.isListening = true;
        }
    }

    public stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    private restart() {
        this.stop();
        setTimeout(() => this.start(), 1000);
    }
}

export const liveSpeechAPI = new LiveSpeechAPI();
