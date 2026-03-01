import type { GuideStep } from '@/components/common/UserGuide.vue';
import i18n from '@/i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (key: string): string => (i18n.global as any).t(key);

export const liveStudioGuide: GuideStep[] = [
    {
        title: () => t('studio.guides.liveStudioWelcomeTitle') || 'Welcome to Live Studio!',
        description: () => t('studio.guides.liveStudioWelcomeDesc') || 'LiveStudio is your professional broadcasting platform. Let\'s take a quick tour to get you started with live streaming and recording.',
        position: 'center',
        tip: () => t('studio.guides.skipTip') || 'You can skip this tutorial anytime by pressing ESC or clicking outside.'
    },
    {
        title: () => t('studio.guides.studioCanvasTitle') || 'Studio Canvas',
        description: () => t('studio.guides.studioCanvasDesc') || 'This is your main canvas where your live stream appears. You can see yourself, guests, and all visual effects in real-time.',
        target: '.main-canvas',
        position: 'right',
        tip: () => t('studio.guides.studioCanvasTip') || 'The canvas automatically adjusts to your selected layout and resolution.'
    },
    {
        title: () => t('studio.guides.effectsRailTitle') || 'Effects Rail',
        description: () => t('studio.guides.effectsRailDesc') || 'Access powerful effects from this sidebar. Choose from layouts, filters, overlays, backgrounds, and more to enhance your stream.',
        target: '.studio-rail',
        position: 'right',
        tip: () => t('studio.guides.effectsRailTip') || 'Click any tab to open the effects panel and customize your stream.'
    },
    {
        title: () => t('studio.guides.stageControlsTitle') || 'Stage Controls',
        description: () => t('studio.guides.stageControlsDesc') || 'Control your microphone, camera, and streaming status from here. Start/stop recording, go live, or capture highlights with one click.',
        target: '.stage-controls',
        position: 'top',
        tip: () => t('studio.guides.stageControlsTip') || 'Green buttons mean active, gray means inactive.'
    },
    {
        title: () => t('studio.guides.liveChatTitle') || 'Live Chat & Interactions',
        description: () => t('studio.guides.liveChatDesc') || 'Engage with your audience in real-time. See messages, spawn likes, and interact with viewers during your stream.',
        target: '.studio-interactions',
        position: 'left',
        tip: () => t('studio.guides.liveChatTip') || 'Messages appear instantly when viewers comment on your stream.'
    },
    {
        title: () => t('studio.guides.guestManagementTitle') || 'Guest Management',
        description: () => t('studio.guides.guestManagementDesc') || 'Invite guests to join your stream! Manage guest slots, summon AI personas, or invite real collaborators.',
        target: '[data-guide="guests"]',
        position: 'left',
        tip: () => t('studio.guides.guestManagementTip') || 'You can have multiple guests in different layouts.'
    },
    {
        title: () => t('studio.guides.goLiveTitle') || 'Go Live!',
        description: () => t('studio.guides.goLiveDesc') || 'When you\'re ready, click the "Go Live" button to start broadcasting to your connected platforms. Make sure your mic and camera are on!',
        target: '[data-guide="go-live"]',
        position: 'top',
        tip: () => t('studio.guides.goLiveTip') || 'Connect platforms from the Platforms tab before going live.'
    },
    {
        title: () => t('studio.guides.allSetTitle') || 'You\'re All Set!',
        description: () => t('studio.guides.allSetDesc') || 'You\'re ready to create amazing live content! Explore the effects, experiment with layouts, and have fun streaming.',
        position: 'center',
        tip: () => t('studio.guides.allSetTip') || 'Press ? anytime to see keyboard shortcuts.'
    }
];

export const recorderGuide: GuideStep[] = [
    {
        title: () => t('studio.guides.recorderWelcomeTitle') || 'Welcome to Recorder!',
        description: () => t('studio.guides.recorderWelcomeDesc') || 'The Recorder lets you capture professional videos with webcam, screen sharing, or AI avatars. Let\'s explore the features!',
        position: 'center',
        tip: () => t('studio.guides.recorderWelcomeTip') || 'Switch between modes using the tabs at the top.'
    },
    {
        title: () => t('studio.guides.recordingModesTitle') || 'Recording Modes',
        description: () => t('studio.guides.recordingModesDesc') || 'Choose your recording mode: Webcam for face camera, Screen for screen capture, or Avatar for AI-powered presentations.',
        target: '.recorder-header',
        position: 'bottom',
        tip: () => t('studio.guides.recordingModesTip') || 'Each mode has unique features optimized for different use cases.'
    },
    {
        title: () => t('studio.guides.previewAreaTitle') || 'Preview Area',
        description: () => t('studio.guides.previewAreaDesc') || 'See yourself or your screen in real-time before recording. What you see here is what will be recorded.',
        target: '.recorder-preview',
        position: 'bottom',
        tip: () => t('studio.guides.previewAreaTip') || 'Adjust your camera angle and lighting before hitting record.'
    },
    {
        title: () => t('studio.guides.recordingControlsTitle') || 'Recording Controls',
        description: () => t('studio.guides.recordingControlsDesc') || 'Start/stop recording, toggle microphone, enable beauty filters, and more. All essential controls are here.',
        target: '.recorder-controls',
        position: 'top',
        tip: () => t('studio.guides.recordingControlsTip') || 'The red button starts recording, click again to stop.'
    },
    {
        title: () => t('studio.guides.sidePanelToolsTitle') || 'Side Panel Tools',
        description: () => t('studio.guides.sidePanelToolsDesc') || 'Access advanced features like filters, backgrounds, teleprompter, and settings from the side panel.',
        target: '.recorder-side-panel',
        position: 'left',
        tip: () => t('studio.guides.sidePanelToolsTip') || 'Click icons on the control bar to open different panels.'
    },
    {
        title: () => t('studio.guides.teleprompterTitle') || 'Teleprompter (Pro Tip!)',
        description: () => t('studio.guides.teleprompterDesc') || 'Use the teleprompter to read your script while recording. Perfect for professional presentations!',
        target: '[data-guide="teleprompter"]',
        position: 'left',
        tip: () => t('studio.guides.teleprompterTip') || 'Adjust scroll speed and font size to your preference.'
    },
    {
        title: () => t('studio.guides.startRecordingTitle') || 'Start Recording!',
        description: () => t('studio.guides.startRecordingDesc') || 'You\'re ready to record! Click the record button when you\'re prepared, and create amazing content.',
        position: 'center',
        tip: () => t('studio.guides.startRecordingTip') || 'Recordings are automatically saved to your project library.'
    }
];

export const avatarSetupGuide: GuideStep[] = [
    {
        title: () => t('studio.guides.avatarWelcomeTitle') || 'Welcome to AI Avatar Setup!',
        description: () => t('studio.guides.avatarWelcomeDesc') || 'Create professional videos with AI avatars. Follow these steps to bring your script to life with realistic AI presenters.',
        position: 'center',
        tip: () => t('studio.guides.avatarWelcomeTip') || 'This is a 4-step process that takes about 2 minutes.'
    },
    {
        title: () => t('studio.guides.step1Title') || 'Step 1: Choose Your Avatar',
        description: () => t('studio.guides.step1Desc') || 'Select from our library of professional AI avatars, or upload your own custom avatar image.',
        target: '.avatar-grid',
        position: 'top',
        tip: () => t('studio.guides.step1Tip') || 'Each avatar has unique characteristics and styles.'
    },
    {
        title: () => t('studio.guides.uploadCustomTitle') || 'Upload Custom Avatar',
        description: () => t('studio.guides.uploadCustomDesc') || 'Want to use your own face? Click the + card to upload a custom avatar photo.',
        target: '.upload-card',
        position: 'top',
        tip: () => t('studio.guides.uploadCustomTip') || 'Use a clear, front-facing photo for best results.'
    },
    {
        title: () => t('studio.guides.step2Title') || 'Step 2: Write Your Script',
        description: () => t('studio.guides.step2Desc') || 'Enter the text you want your avatar to speak. Be natural and conversational!',
        target: '.glow-textarea',
        position: 'right',
        tip: () => t('studio.guides.step2Tip') || 'You can use AI to generate scripts or write your own.'
    },
    {
        title: () => t('studio.guides.step3Title') || 'Step 3: Select Voice',
        description: () => t('studio.guides.step3Desc') || 'Choose a voice that matches your avatar. We have voices in multiple languages and accents.',
        target: '.voice-presets-list',
        position: 'left',
        tip: () => t('studio.guides.step3Tip') || 'Click the play button to preview each voice.'
    },
    {
        title: () => t('studio.guides.step4Title') || 'Advanced Voice Settings',
        description: () => t('studio.guides.step4Desc') || 'Fine-tune your voice with advanced controls like pitch, speed, and emotion.',
        target: '.advanced-toggle',
        position: 'left',
        tip: () => t('studio.guides.step4Tip') || 'Toggle this to access professional voice customization.'
    },
    {
        title: () => t('studio.guides.generateTitle') || 'Generate Your Video!',
        description: () => t('studio.guides.generateDesc') || 'All set! Click "Generate Video" and our AI will create your professional avatar video in minutes.',
        target: '[data-guide="generate-btn"]',
        position: 'top',
        tip: () => t('studio.guides.generateTip') || 'You\'ll be notified when your video is ready.'
    }
];
