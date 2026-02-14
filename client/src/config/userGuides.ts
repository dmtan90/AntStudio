import type { GuideStep } from '@/components/common/UserGuide.vue';

export const liveStudioGuide: GuideStep[] = [
    {
        title: 'Welcome to Live Studio!',
        description: 'LiveStudio is your professional broadcasting platform. Let\'s take a quick tour to get you started with live streaming and recording.',
        position: 'center',
        tip: 'You can skip this tutorial anytime by pressing ESC or clicking outside.'
    },
    {
        title: 'Studio Canvas',
        description: 'This is your main canvas where your live stream appears. You can see yourself, guests, and all visual effects in real-time.',
        target: '.main-canvas',
        position: 'right',
        tip: 'The canvas automatically adjusts to your selected layout and resolution.'
    },
    {
        title: 'Effects Rail',
        description: 'Access powerful effects from this sidebar. Choose from layouts, filters, overlays, backgrounds, and more to enhance your stream.',
        target: '.studio-rail',
        position: 'right',
        tip: 'Click any tab to open the effects panel and customize your stream.'
    },
    {
        title: 'Stage Controls',
        description: 'Control your microphone, camera, and streaming status from here. Start/stop recording, go live, or capture highlights with one click.',
        target: '.stage-controls',
        position: 'top',
        tip: 'Green buttons mean active, gray means inactive.'
    },
    {
        title: 'Live Chat & Interactions',
        description: 'Engage with your audience in real-time. See messages, spawn likes, and interact with viewers during your stream.',
        target: '.studio-interactions',
        position: 'left',
        tip: 'Messages appear instantly when viewers comment on your stream.'
    },
    {
        title: 'Guest Management',
        description: 'Invite guests to join your stream! Manage guest slots, summon AI personas, or invite real collaborators.',
        target: '[data-guide="guests"]',
        position: 'left',
        tip: 'You can have multiple guests in different layouts.'
    },
    {
        title: 'Go Live!',
        description: 'When you\'re ready, click the "Go Live" button to start broadcasting to your connected platforms. Make sure your mic and camera are on!',
        target: '[data-guide="go-live"]',
        position: 'top',
        tip: 'Connect platforms from the Platforms tab before going live.'
    },
    {
        title: 'You\'re All Set!',
        description: 'You\'re ready to create amazing live content! Explore the effects, experiment with layouts, and have fun streaming.',
        position: 'center',
        tip: 'Press ? anytime to see keyboard shortcuts.'
    }
];

export const recorderGuide: GuideStep[] = [
    {
        title: 'Welcome to Recorder!',
        description: 'The Recorder lets you capture professional videos with webcam, screen sharing, or AI avatars. Let\'s explore the features!',
        position: 'center',
        tip: 'Switch between modes using the tabs at the top.'
    },
    {
        title: 'Recording Modes',
        description: 'Choose your recording mode: Webcam for face camera, Screen for screen capture, or Avatar for AI-powered presentations.',
        target: '.recorder-header',
        position: 'bottom',
        tip: 'Each mode has unique features optimized for different use cases.'
    },
    {
        title: 'Preview Area',
        description: 'See yourself or your screen in real-time before recording. What you see here is what will be recorded.',
        target: '.recorder-preview',
        position: 'bottom',
        tip: 'Adjust your camera angle and lighting before hitting record.'
    },
    {
        title: 'Recording Controls',
        description: 'Start/stop recording, toggle microphone, enable beauty filters, and more. All essential controls are here.',
        target: '.recorder-controls',
        position: 'top',
        tip: 'The red button starts recording, click again to stop.'
    },
    {
        title: 'Side Panel Tools',
        description: 'Access advanced features like filters, backgrounds, teleprompter, and settings from the side panel.',
        target: '.recorder-side-panel',
        position: 'left',
        tip: 'Click icons on the control bar to open different panels.'
    },
    {
        title: 'Teleprompter (Pro Tip!)',
        description: 'Use the teleprompter to read your script while recording. Perfect for professional presentations!',
        target: '[data-guide="teleprompter"]',
        position: 'left',
        tip: 'Adjust scroll speed and font size to your preference.'
    },
    {
        title: 'Start Recording!',
        description: 'You\'re ready to record! Click the record button when you\'re prepared, and create amazing content.',
        position: 'center',
        tip: 'Recordings are automatically saved to your project library.'
    }
];

export const avatarSetupGuide: GuideStep[] = [
    {
        title: 'Welcome to AI Avatar Setup!',
        description: 'Create professional videos with AI avatars. Follow these steps to bring your script to life with realistic AI presenters.',
        position: 'center',
        tip: 'This is a 4-step process that takes about 2 minutes.'
    },
    {
        title: 'Step 1: Choose Your Avatar',
        description: 'Select from our library of professional AI avatars, or upload your own custom avatar image.',
        target: '.avatar-grid',
        position: 'top',
        tip: 'Each avatar has unique characteristics and styles.'
    },
    {
        title: 'Upload Custom Avatar',
        description: 'Want to use your own face? Click the + card to upload a custom avatar photo.',
        target: '.upload-card',
        position: 'top',
        tip: 'Use a clear, front-facing photo for best results.'
    },
    {
        title: 'Step 2: Write Your Script',
        description: 'Enter the text you want your avatar to speak. Be natural and conversational!',
        target: '.glow-textarea',
        position: 'right',
        tip: 'You can use AI to generate scripts or write your own.'
    },
    {
        title: 'Step 3: Select Voice',
        description: 'Choose a voice that matches your avatar. We have voices in multiple languages and accents.',
        target: '.voice-presets-list',
        position: 'left',
        tip: 'Click the play button to preview each voice.'
    },
    {
        title: 'Advanced Voice Settings',
        description: 'Fine-tune your voice with advanced controls like pitch, speed, and emotion.',
        target: '.advanced-toggle',
        position: 'left',
        tip: 'Toggle this to access professional voice customization.'
    },
    {
        title: 'Generate Your Video!',
        description: 'All set! Click "Generate Video" and our AI will create your professional avatar video in minutes.',
        target: '[data-guide="generate-btn"]',
        position: 'top',
        tip: 'You\'ll be notified when your video is ready.'
    }
];
