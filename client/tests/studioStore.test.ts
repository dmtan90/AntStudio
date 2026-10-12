import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// The store's cross-slice calls (scene <-> guests <-> control) go through late-bound wrappers;
// these tests make sure they resolve and that state stays shared across slices.
const sync = vi.hoisted(() => ({ broadcastStudioState: vi.fn() }))
vi.mock('@/utils/ai/ActionSyncService', () => ({ ActionSyncService: { getSocket: () => null, broadcastStudioState: sync.broadcastStudioState } }))
vi.mock('@/utils/ai/VisualConceptService', () => ({ VisualConceptService: { generateConcept: vi.fn(async () => null) } }))
vi.mock('@/utils/api', () => ({ default: { get: vi.fn(async () => ({ data: {} })), post: vi.fn(async () => ({ data: {} })) }, getFileUrl: (p: string) => p }))
vi.mock('vue-sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }) }))

const { useStudioStore } = await import('@/stores/studio')

beforeEach(() => {
    setActivePinia(createPinia())
    sync.broadcastStudioState.mockClear()
})

describe('studio store', () => {
    it('re-exports the public types and constants', async () => {
        const mod = await import('@/stores/studio')
        expect(mod.DEFAULT_VISUAL_SETTINGS).toBeTruthy()
        expect(mod.DEFAULT_AR_SETTINGS).toBeTruthy()
    })

    it('runs guest actions that call into the scene and control slices', { timeout: 15000 }, async () => {
        const store = useStudioStore()
        store.addGuest({ uuid: 'g1', name: 'Guest One', type: 'human', status: 'waiting', audioEnabled: true, videoEnabled: true } as any)
        store.approveGuest('g1')
        expect(store.liveGuests.map((g: any) => g.uuid)).toContain('g1')

        await store.switchScene('interview')
        expect(store.activeScene.id).toBe('interview')

        store.addAICoHostToStudio('ai2', 'AI Two')
        expect(store.liveGuests.map((g: any) => g.uuid)).toContain('ai2')

        await new Promise(r => setTimeout(r, 2500)) // debounced state broadcast
        expect(sync.broadcastStudioState).toHaveBeenCalled()
    })

    it('shares state between slices', () => {
        const store = useStudioStore()
        store.updateStudioVibe('hype', true)
        store.applyContextPreset('sales')
        store.triggerQuest({ id: 'q1', title: 'Q', target: 2, current: 0, rewardXp: 10, completed: false } as any)
        store.updateQuestProgress(5)
        expect(store.activeQuest?.completed).toBe(true)
        expect(store.streamingContext).toBe('sales')
    })
})
