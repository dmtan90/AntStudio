// Guests, co-hosts and collaborators (moved verbatim from the studio store setup function).
import api from '@/utils/api';
import { ActionSyncService } from '@/utils/ai/ActionSyncService';
import { toast } from 'vue-sonner';
import { generateUUID } from '@/utils/uuid';
import { Guest, CoHost } from './types';
import type { StudioContext } from './context';

export function createGuestsActions(ctx: StudioContext) {
    const { activeScene, liveGuests, waitingGuests, guestJoinLink, coHosts, projectTeam, maxGuests, guestPermissions } = ctx.state;
    const broadcastCurrentState = (...args: any[]) => ctx.fns.broadcastCurrentState(...args);
    const switchScene = (...args: any[]) => ctx.fns.switchScene(...args);

    // ============================================
    // Actions: Guests
    // ============================================

    async function generateInvite(sessionId: string) {
        try {
            const res: any = await api.post('/streaming/invite', { sessionId });
            if (res.data.inviteUrl) {
                const { token, inviteUrl } = res.data;
				const link = `${window.location.origin}/join/${token}`;
                guestJoinLink.value = link;
                return guestJoinLink.value;
            }
        } catch (error) {
            console.error('[StudioStore] Failed to generate guest invite:', error);
            toast.error('Failed to generate secure invite link');
        }
        return null;
    }

    function generateGuestLink() {
        // Mock method retired. Early session preparation ensures real tokens are always available.
        return guestJoinLink.value || '';
    }

    function addGuest(guest: Guest) {
        // Generate UUID if not present
        if (!guest.uuid) {
            guest.uuid = generateUUID();
        }
        
        // Deduplicate: If guest already exists in waiting or live, don't add again
        const exists = waitingGuests.value.some(g => g.uuid === guest.uuid) ||
            liveGuests.value.some(g => g.uuid === guest.uuid);

        if (exists) {
            console.log(`[Studio] Guest ${guest.name} (${guest.uuid}) already in lists, skipping duplicate.`);
            return true;
        }

        if (liveGuests.value.length + waitingGuests.value.length >= maxGuests.value) {
            console.warn('[Studio] Max guests reached');
            return false;
        }

        // Auto-approve if AI guest OR status is pre-set to live OR auto-approve is enabled
        const shouldAutoApprove = guest.type === 'ai' || 
                                 guest.status === 'live' || 
                                 guestPermissions.value.autoApprove;

        if (shouldAutoApprove) {
            console.log('[Studio] Automatically adding guest to live session:', guest.name);
            
            // Auto-assign first available slot for immediate rendering
            const usedSlots = new Set(liveGuests.value.map(g => g.slotIndex).filter(s => s !== undefined));
            let autoSlot: number | undefined = undefined;
            for (let i = 0; i < 4; i++) {
                if (!usedSlots.has(i)) {
                    autoSlot = i;
                    break;
                }
            }

            const approvedGuest = { ...guest, status: 'live' as const, slotIndex: autoSlot };
            liveGuests.value.push(approvedGuest);

            // Signal approval after a short delay
            setTimeout(() => {
                approveGuest(guest.uuid);
            }, 500);
            return true;
        }

        waitingGuests.value.push(guest);
        return true;
    }

    function approveGuest(guestId: string) {
        const index = waitingGuests.value.findIndex(g => g.uuid === guestId);

        if (index !== -1) {
            const guest = waitingGuests.value[index];
            liveGuests.value.push({ ...guest, status: 'live' });
            waitingGuests.value.splice(index, 1);
        } else {
            // Check if they are already in live (e.g. from auto-approve path)
            const guestInLive = liveGuests.value.find(g => g.uuid === guestId);
            if (guestInLive) {
                guestInLive.status = 'live';
            }
        }

        // Notify via signaling
        const socket = ActionSyncService.getSocket();
        if (socket) {
            console.log('[Studio] Sending approval signal to guest:', guestId);
            socket.emit('guest:approve', {
                guestId,
                permissions: {
                    micEnabled: guestPermissions.value.micEnabled,
                    camEnabled: guestPermissions.value.camEnabled
                }
            });
        }
    }

    function rejectGuest(guestId: string) {
        waitingGuests.value = waitingGuests.value.filter(g => g.uuid !== guestId);

        // Notify via signaling
        const socket = ActionSyncService.getSocket();
        if (socket) {
            socket.emit('guest:reject', { guestId });
        }
    }

    function removeGuest(guestId: string) {
        console.log(`[StudioStore] Removing guest: ${guestId}`);
        liveGuests.value = liveGuests.value.filter(g => g.uuid !== guestId && g.socketId !== guestId);
        waitingGuests.value = waitingGuests.value.filter(g => g.uuid !== guestId && g.socketId !== guestId);
        broadcastCurrentState();
    }

    function updateGuestStatus(guestId: string, status: Guest['status']) {
        let guest = liveGuests.value.find(g => g.uuid === guestId);
        if (guest) {
            guest.status = status;
        } else {
            guest = waitingGuests.value.find(g => g.uuid === guestId);
            if (guest) guest.status = status;
        }
    }

    function muteGuest(guestId: string, enabled: boolean) {
        const guest = liveGuests.value.find(g => g.uuid === guestId);
        if (guest) {
            guest.audioEnabled = enabled;
            ActionSyncService.sendGuestControl(guestId, 'audio', enabled);
            broadcastCurrentState();
        }
    }

    function toggleGuestCamera(guestId: string, enabled: boolean) {
        const guest = liveGuests.value.find(g => g.uuid === guestId);
        if (guest) {
            guest.videoEnabled = enabled;
            ActionSyncService.sendGuestControl(guestId, 'video', enabled);
            broadcastCurrentState();
        }
    }

    function kickGuest(guestId: string) {
        // First tell the guest they are kicked
        ActionSyncService.sendGuestControl(guestId, 'kick', true);
        // Then remove locally
        removeGuest(guestId);
    }

    function assignGuestToSlot(guestId: string, slotIndex: number | undefined) {
        console.log(`[Studio] Assigning guest ${guestId} to slot ${slotIndex}`);
        // 1. If slotIndex is provided, clear it from any other guest first
        if (slotIndex !== undefined) {
            liveGuests.value.forEach(g => {
                if (g.slotIndex === slotIndex && g.uuid !== guestId) {
                    g.slotIndex = undefined;
                }
            });
        }

        // 2. Assign the new slot
        let guest = liveGuests.value.find(g => g.uuid === guestId);
        
        // 3. If not in live, check waiting (Auto-approve on drag)
        if (!guest) {
            const waitingIdx = waitingGuests.value.findIndex(g => g.uuid === guestId);
            if (waitingIdx !== -1) {
                console.log(`[Studio] Auto-approving guest ${guestId} due to slot assignment`);
                guest = waitingGuests.value[waitingIdx];
                // Move to live
                waitingGuests.value.splice(waitingIdx, 1);
                guest.status = 'live';
                liveGuests.value.push(guest);
                
                // Notify via socket
                const socket = ActionSyncService.getSocket();
                if (socket) {
                    socket.emit('guest:approve', {
                        guestId,
                        permissions: {
                            micEnabled: guestPermissions.value.micEnabled,
                            camEnabled: guestPermissions.value.camEnabled
                        }
                    });
                }
            }
        }

        if (guest) {
            guest.slotIndex = slotIndex;
            console.log(`[Studio] Assigned guest ${guest.name} (${guest.uuid}) to slot ${slotIndex}`);
            broadcastCurrentState();
        } else {
            console.warn(`[Studio] assignGuestToSlot: Guest ${guestId} not found in live or waiting lists`);
        }
    }

    async function swapWithHost(guestId: string) {
        if (activeScene.value.type !== 'standard' && activeScene.value.type !== 'fullscreen') {
            // Force a standard scene for solo focus if not already in one
            await switchScene('standard');
        }

        const guest = liveGuests.value.find(g => g.uuid === guestId);
        if (!guest) return;

        // Implementation of 'Solo' mode: 
        // We temporarily override the host region's source or swap slots.
        // For standard AntStudio logic, we assign the guest to Slot 1 
        // and if it's a 'shoutout' or 'standard' scene, it will show them.

        // Let's create a temporary scene override or just assign to Slot 0 (S1) 
        // and ensure the scene uses guest1 as source if soloing.

        // Simpler: Just switch to shoutout scene for that guest
        await switchScene('shoutout');
        assignGuestToSlot(guestId, 0); // Map to guest1
    }

    // ============================================
    // Actions: Co-Hosts
    // ============================================

    function addCoHost(coHost: CoHost) {
        if (!coHosts.value.find(c => c.id === coHost.id)) {
            coHosts.value.push(coHost);
        }
    }

    function removeCoHost(coHostId: string) {
        coHosts.value = coHosts.value.filter(c => c.id !== coHostId);
    }

    function hasPermission(coHostId: string, permission: string) {
        const coHost = coHosts.value.find(c => c.id === coHostId);
        return coHost?.permissions.includes(permission) || false;
    }

    const fetchCollaborators = async (projectId: string) => {
        try {
            const res = (await api.get(`/collaboration/${projectId}/users`)) as any;
            if (res.success) {
                projectTeam.value = res.data.data.collaborators.map((c: any) => ({
                    id: c.userId._id,
                    name: c.userId.name,
                    avatar: c.userId.avatar || '',
                    permissions: c.permissions,
                    status: 'offline' // Online status will be synced via ActionSyncService
                }));
            }
        } catch (error) {
            console.error('[StudioStore] Error fetching collaborators:', error);
        }
    };

    return {
        generateInvite,
        generateGuestLink,
        addGuest,
        approveGuest,
        rejectGuest,
        removeGuest,
        updateGuestStatus,
        muteGuest,
        toggleGuestCamera,
        kickGuest,
        assignGuestToSlot,
        swapWithHost,
        addCoHost,
        removeCoHost,
        hasPermission,
        fetchCollaborators,
    };
}
