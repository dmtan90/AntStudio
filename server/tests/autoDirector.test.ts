import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/Logger.js', () => ({ Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { autoDirectorService } = await import('../src/services/ai/AutoDirectorService.js');

afterEach(() => {
    autoDirectorService.removeAllListeners('cut');
    autoDirectorService.toggleDirector('alice', false);
    autoDirectorService.toggleDirector('bob', false);
});

describe('AutoDirectorService', () => {
    it('only cuts for owners who enabled the director', () => {
        const cuts: any[] = [];
        autoDirectorService.on('cut', (cut) => cuts.push(cut));

        autoDirectorService.toggleDirector('alice', true);
        autoDirectorService.handleVoiceActivity('alice', 'guest_1', 0.9);
        autoDirectorService.handleVoiceActivity('bob', 'guest_2', 0.9); // bob never enabled it

        expect(cuts).toHaveLength(1);
        expect(cuts[0]).toMatchObject({ ownerId: 'alice', target: 'guest_1' });
    });

    it('keeps each owner\'s state independent', () => {
        const cuts: any[] = [];
        autoDirectorService.on('cut', (cut) => cuts.push(cut));

        autoDirectorService.toggleDirector('alice', true);
        autoDirectorService.toggleDirector('bob', true);
        autoDirectorService.handleVoiceActivity('alice', 'guest_1', 0.9);
        autoDirectorService.handleVoiceActivity('bob', 'guest_1', 0.9); // same target, other studio: still cuts

        expect(cuts.map(c => c.ownerId)).toEqual(['alice', 'bob']);

        // Turning bob off doesn't affect alice
        autoDirectorService.toggleDirector('bob', false);
        autoDirectorService.setScreenShareStatus('alice', true);
        expect(cuts.at(-1)).toMatchObject({ ownerId: 'alice', target: 'screen' });
    });

    it('ignores quiet audio', () => {
        const cuts: any[] = [];
        autoDirectorService.on('cut', (cut) => cuts.push(cut));
        autoDirectorService.toggleDirector('alice', true);
        autoDirectorService.handleVoiceActivity('alice', 'guest_1', 0.05);
        expect(cuts).toHaveLength(0);
    });
});
