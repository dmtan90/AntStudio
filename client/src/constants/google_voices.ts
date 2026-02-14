export const GOOGLE_VOICES: Record<string, { name: string; id: string; gender: 'Male' | 'Female' }[]> = {
    'vi-VN': [
        { name: 'Wavenet A (Female)', id: 'vi-VN-Wavenet-A', gender: 'Female' },
        { name: 'Wavenet B (Male)', id: 'vi-VN-Wavenet-B', gender: 'Male' },
        { name: 'Wavenet C (Female)', id: 'vi-VN-Wavenet-C', gender: 'Female' },
        { name: 'Wavenet D (Male)', id: 'vi-VN-Wavenet-D', gender: 'Male' },
        { name: 'Standard A (Female)', id: 'vi-VN-Standard-A', gender: 'Female' },
        { name: 'Standard B (Male)', id: 'vi-VN-Standard-B', gender: 'Male' },
        { name: 'Standard C (Female)', id: 'vi-VN-Standard-C', gender: 'Female' },
        { name: 'Standard D (Male)', id: 'vi-VN-Standard-D', gender: 'Male' },
    ],
    'en-US': [
        { name: 'Journey D (Male)', id: 'en-US-Journey-D', gender: 'Male' },
        { name: 'Journey F (Female)', id: 'en-US-Journey-F', gender: 'Female' },
        { name: 'Neural2 A (Male)', id: 'en-US-Neural2-A', gender: 'Male' },
        { name: 'Neural2 C (Female)', id: 'en-US-Neural2-C', gender: 'Female' },
        { name: 'Neural2 D (Male)', id: 'en-US-Neural2-D', gender: 'Male' },
        { name: 'Neural2 F (Female)', id: 'en-US-Neural2-F', gender: 'Female' },
        { name: 'Studio M (Male)', id: 'en-US-Studio-M', gender: 'Male' },
        { name: 'Studio O (Female)', id: 'en-US-Studio-O', gender: 'Female' },
        { name: 'Wavenet A (Male)', id: 'en-US-Wavenet-A', gender: 'Male' },
        { name: 'Wavenet C (Female)', id: 'en-US-Wavenet-C', gender: 'Female' },
        { name: 'Wavenet D (Male)', id: 'en-US-Wavenet-D', gender: 'Male' },
        { name: 'Wavenet F (Female)', id: 'en-US-Wavenet-F', gender: 'Female' },
    ],
    'en-GB': [
        { name: 'Neural2 A (Female)', id: 'en-GB-Neural2-A', gender: 'Female' },
        { name: 'Neural2 B (Male)', id: 'en-GB-Neural2-B', gender: 'Male' },
        { name: 'Wavenet A (Female)', id: 'en-GB-Wavenet-A', gender: 'Female' },
        { name: 'Wavenet B (Male)', id: 'en-GB-Wavenet-B', gender: 'Male' },
    ],
    'ja-JP': [
        { name: 'Neural2 B (Female)', id: 'ja-JP-Neural2-B', gender: 'Female' },
        { name: 'Neural2 C (Male)', id: 'ja-JP-Neural2-C', gender: 'Male' },
        { name: 'Neural2 D (Male)', id: 'ja-JP-Neural2-D', gender: 'Male' },
        { name: 'Wavenet A (Female)', id: 'ja-JP-Wavenet-A', gender: 'Female' },
        { name: 'Wavenet B (Female)', id: 'ja-JP-Wavenet-B', gender: 'Female' },
        { name: 'Wavenet C (Male)', id: 'ja-JP-Wavenet-C', gender: 'Male' },
        { name: 'Wavenet D (Male)', id: 'ja-JP-Wavenet-D', gender: 'Male' },
    ],
    'ko-KR': [
        { name: 'Neural2 A (Female)', id: 'ko-KR-Neural2-A', gender: 'Female' },
        { name: 'Neural2 C (Male)', id: 'ko-KR-Neural2-C', gender: 'Male' },
        { name: 'Wavenet A (Female)', id: 'ko-KR-Wavenet-A', gender: 'Female' },
        { name: 'Wavenet C (Male)', id: 'ko-KR-Wavenet-C', gender: 'Male' },
    ],
    'cmn-CN': [
        { name: 'Wavenet A (Female)', id: 'cmn-CN-Wavenet-A', gender: 'Female' },
        { name: 'Wavenet B (Male)', id: 'cmn-CN-Wavenet-B', gender: 'Male' },
        { name: 'Wavenet C (Male)', id: 'cmn-CN-Wavenet-C', gender: 'Male' },
    ],
    'fr-FR': [
        { name: 'Neural2 A (Female)', id: 'fr-FR-Neural2-A', gender: 'Female' },
        { name: 'Neural2 B (Male)', id: 'fr-FR-Neural2-B', gender: 'Male' },
    ],
    'de-DE': [
        { name: 'Neural2 B (Male)', id: 'de-DE-Neural2-B', gender: 'Male' },
        { name: 'Neural2 C (Female)', id: 'de-DE-Neural2-C', gender: 'Female' },
    ]
};

export const SUPPORTED_LANGUAGES = [
    { label: 'Vietnamese (Tiếng Việt)', value: 'vi-VN' },
    { label: 'English (US)', value: 'en-US' },
    { label: 'English (UK)', value: 'en-GB' },
    { label: 'Japanese (日本語)', value: 'ja-JP' },
    { label: 'Korean (한국어)', value: 'ko-KR' },
    { label: 'Chinese (Mandarin)', value: 'cmn-CN' },
    { label: 'French (France)', value: 'fr-FR' },
    { label: 'German (Germany)', value: 'de-DE' },
];
