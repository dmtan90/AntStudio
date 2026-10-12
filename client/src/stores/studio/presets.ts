// Built-in scene presets (moved verbatim from stores/studio.ts).
import { Scene } from './types';

// ============================================
// Scene Presets
// ============================================

export const SCENE_PRESETS: Scene[] = [
    {
        id: 'standard',
        type: 'standard',
        name: 'Standard',
        icon: 'User',
        description: 'Single host, centered',
        hotkey: '1',
        layout: {
            regions: [
                { id: 'main', x: 0, y: 0, width: 100, height: 100, source: 'host', zIndex: 1 }
            ]
        }
    },
    {
        id: 'interview',
        type: 'interview',
        name: 'Interview',
        icon: 'PeopleBottom',
        description: 'Split screen (host + guest)',
        hotkey: '2',
        layout: {
            regions: [
                { id: 'host', x: 0, y: 0, width: 50, height: 100, source: 'host', zIndex: 1 },
                { id: 'guest1', x: 50, y: 0, width: 50, height: 100, source: 'guest1', zIndex: 1 }
            ]
        }
    },
    {
        id: 'grid',
        type: 'grid',
        name: 'Grid',
        icon: 'FourRoundPoint',
        description: 'Multi-guest conference (2x2)',
        hotkey: '3',
        layout: {
            regions: [
                { id: 'host', x: 0, y: 0, width: 50, height: 50, source: 'host', zIndex: 1 },
                { id: 'guest1', x: 50, y: 0, width: 50, height: 50, source: 'guest1', zIndex: 1, objectFit: 'contain' },
                { id: 'guest2', x: 0, y: 50, width: 50, height: 50, source: 'guest2', zIndex: 1, objectFit: 'contain' },
                { id: 'guest3', x: 50, y: 50, width: 50, height: 50, source: 'guest3', zIndex: 1, objectFit: 'contain' }
            ]
        }
    },
    {
        id: 'shoutout',
        type: 'shoutout',
        name: 'Shoutout',
        icon: 'Star',
        description: 'Full-screen guest highlight',
        hotkey: '4',
        layout: {
            regions: [
                { id: 'guest1', x: 0, y: 0, width: 100, height: 100, source: 'guest1', zIndex: 1, objectFit: 'contain' }
            ]
        }
    },
    {
        id: 'sale_duo',
        type: 'shoutout',
        name: 'Sale Duo',
        icon: 'People',
        description: 'Two influencers side-by-side',
        layout: {
            regions: [
                { id: 'g1', x: 0, y: 0, width: 50, height: 100, source: 'guest1', zIndex: 1, objectFit: 'contain' },
                { id: 'g2', x: 50, y: 0, width: 50, height: 100, source: 'guest2', zIndex: 1, objectFit: 'contain' }
            ]
        }
    },
    {
        id: 'sale_trio',
        type: 'shoutout',
        name: 'Sale Trio',
        icon: 'EveryUser',
        description: 'Three influencers side-by-side',
        layout: {
            regions: [
                { id: 'g1', x: 0, y: 0, width: 33.3, height: 100, source: 'guest1', zIndex: 1, objectFit: 'contain' },
                { id: 'g2', x: 33.3, y: 0, width: 33.3, height: 100, source: 'guest2', zIndex: 1, objectFit: 'contain' },
                { id: 'g3', x: 66.6, y: 0, width: 33.4, height: 100, source: 'guest3', zIndex: 1, objectFit: 'contain' }
            ]
        }
    },
    {
        id: 'fullscreen',
        type: 'fullscreen',
        name: 'Studio Full',
        icon: 'FullScreen',
        description: 'Wide angle, full setup',
        hotkey: '5',
        layout: {
            regions: [
                { id: 'main', x: 0, y: 0, width: 100, height: 100, source: 'host', zIndex: 1 }
            ]
        }
    },
    {
        id: 'pip',
        type: 'pip',
        name: 'Picture-in-Picture',
        icon: 'ReduceOne',
        description: 'Main + small overlay',
        hotkey: '6',
        layout: {
            regions: [
                { id: 'main', x: 0, y: 0, width: 100, height: 100, source: 'host', zIndex: 1 },
                {
                    id: 'overlay',
                    x: 70,
                    y: 70,
                    width: 25,
                    height: 25,
                    source: 'guest1',
                    zIndex: 2,
                    shape: 'rect',
                    borderRadius: 16,
                    border: { width: 2, color: '#3b82f6' },
                    shadow: { blur: 15, color: 'rgba(0,0,0,0.5)', x: 0, y: 4 }
                }
            ]
        }
    },
    {
        id: 'sidebyside',
        type: 'sidebyside',
        name: 'Side-by-Side',
        icon: 'AlignLeftTwo',
        description: 'Dual camera comparison',
        hotkey: '7',
        layout: {
            regions: [
                { id: 'left', x: 5, y: 10, width: 42, height: 80, source: 'host', zIndex: 1, borderRadius: 12 },
                { id: 'right', x: 53, y: 10, width: 42, height: 80, source: 'guest1', zIndex: 1, borderRadius: 12 }
            ]
        }
    },
    {
        id: 'supergrid',
        type: 'grid',
        name: 'Super Grid',
        icon: 'ApplicationTwo',
        description: 'Host focused + 4 guest sidebar',
        hotkey: '8',
        layout: {
            regions: [
                { id: 'main', x: 2, y: 10, width: 66, height: 80, source: 'host', zIndex: 1, borderRadius: 16 },
                { id: 'g1', x: 70, y: 10, width: 28, height: 18, source: 'guest1', zIndex: 1, borderRadius: 8 },
                { id: 'g2', x: 70, y: 31, width: 28, height: 18, source: 'guest2', zIndex: 1, borderRadius: 8 },
                { id: 'g3', x: 70, y: 52, width: 28, height: 18, source: 'guest3', zIndex: 1, borderRadius: 8 },
                { id: 'g4', x: 70, y: 73, width: 28, height: 18, source: 'guest4', zIndex: 1, borderRadius: 8 }
            ]
        }
    },
    {
        id: 'guestfocus',
        type: 'pip',
        name: 'Guest Focus',
        icon: 'Association',
        description: '4-Guest Grid + Host PiP',
        hotkey: '9',
        layout: {
            regions: [
                { id: 'g1', x: 2, y: 10, width: 47, height: 39, source: 'guest1', zIndex: 1, borderRadius: 12 },
                { id: 'g2', x: 51, y: 10, width: 47, height: 39, source: 'guest2', zIndex: 1, borderRadius: 12 },
                { id: 'g3', x: 2, y: 51, width: 47, height: 39, source: 'guest3', zIndex: 1, borderRadius: 12 },
                { id: 'g4', x: 51, y: 51, width: 47, height: 39, source: 'guest4', zIndex: 1, borderRadius: 12 },
                {
                    id: 'host-pip',
                    x: 80, y: 80, width: 18, height: 18,
                    source: 'host', zIndex: 2, shape: 'rect', borderRadius: 12,
                    border: { width: 2, color: '#3b82f6' },
                    shadow: { blur: 10, color: 'rgba(0,0,0,0.5)', x: 0, y: 2 }
                }
            ]
        }
    },
    {
        id: 'screen_focus',
        type: 'standard',
        name: 'Screen Focus',
        icon: 'Monitor',
        description: 'Screen sharing centered with host PiP',
        hotkey: '0',
        layout: {
            regions: [
                { id: 'screen', x: 0, y: 0, width: 100, height: 100, source: 'screen', zIndex: 1 },
                {
                    id: 'host-pip',
                    x: 75, y: 75, width: 22, height: 22,
                    source: 'host', zIndex: 2, shape: 'rect', borderRadius: 12,
                    border: { width: 2, color: '#3b82f6' },
                    shadow: { blur: 10, color: 'rgba(0,0,0,0.5)', x: 0, y: 2 }
                }
            ]
        }
    }
];
