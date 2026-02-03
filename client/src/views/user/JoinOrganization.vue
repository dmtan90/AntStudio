<template>
    <div class="join-org-view p-6 max-w-xl mx-auto py-20 text-center animate-in">
        <div v-if="verifying" class="verifying-state">
            <peoples theme="outline" size="48" class="animate-pulse mb-6 opacity-30" />
            <h2 class="text-2xl font-black uppercase">Decrypting Invite...</h2>
            <p class="opacity-40 mt-2">Validating neural handshake with tactical headquarters.</p>
        </div>

        <div v-else-if="invitation" class="invitation-card glass-card p-10 space-y-6">
            <div
                class="org-badge mx-auto w-20 h-20 rounded-3xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <broadcast theme="outline" size="40" />
            </div>
            <h2 class="text-3xl font-black tracking-tighter uppercase">Team Commission Received</h2>
            <p class="text-lg">
                You have been invited to join <span class="text-blue-400 font-bold">{{ orgName }}</span>
                as a <span class="bg-blue-500/10 px-2 py-1 rounded text-sm font-black">{{ invitation.role.toUpperCase()
                    }}</span>.
            </p>
            <div class="actions flex gap-4">
                <el-button @click="handleDecline" class="glass-btn flex-1">Decline</el-button>
                <el-button type="primary" @click="handleAccept" :loading="joining" class="accept-btn flex-1">Accept
                    Commission</el-button>
            </div>
        </div>

        <div v-else class="error-state space-y-4">
            <close theme="outline" size="48" class="mx-auto text-red-500 opacity-50" />
            <h2 class="text-xl font-bold">Tactical Handshake Failed</h2>
            <p class="opacity-40">{{ error || 'This invitation link is invalid or has expired.' }}</p>
            <el-button @click="$router.push('/dashboard')" class="glass-btn">Return to Base</el-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Peoples, Broadcast, Close } from '@icon-park/vue-next';
import { useOrganizationStore } from '@/stores/organization';
import { toast } from 'vue-sonner';

const route = useRoute();
const router = useRouter();
const verifying = ref(true);
const joining = ref(false);
const invitation = ref<any>(null);
const orgName = ref('');
const error = ref('');
const orgStore = useOrganizationStore();

const checkInvitation = async () => {
    const token = route.query.token;
    if (!token) {
        verifying.value = false;
        return;
    }

    try {
        // We'll need an endpoint to preview/verify invite without accepting
        // For now, let's assume we use the accept endpoint directly if user confirms
        // but it would be better to have an info endpoint.
        // Mocking info for Demo:
        invitation.value = { role: 'editor', token };
        orgName.value = 'Tactical Unit';
    } catch (e: any) {
        error.value = e.response?.data?.error || 'Validation failed';
    } finally {
        verifying.value = false;
    }
};

const handleAccept = async () => {
    joining.value = true;

    try {
        await orgStore.acceptInviteByToken(invitation.value.token);
        toast.success("Tactical Link Established! Welcome to the team.");
        router.push('/organization');
    } catch (e: any) {
        toast.error(e.response?.data?.error || "Failed to accept commission");
    } finally {
        joining.value = false;
    }
};

const handleDecline = () => {
    toast.info("Commission declined.");
    router.push('/dashboard');
};

onMounted(checkInvitation);
</script>

<style scoped lang="scss">
.accept-btn {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border: none;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.glass-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #fff;
}
</style>
