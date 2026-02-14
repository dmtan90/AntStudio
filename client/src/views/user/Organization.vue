<template>
    <div class="organization-view p-6 max-w-7xl mx-auto animate-in">
        <header class="page-header flex justify-between items-center mb-10">
            <div>
                <h1 class="text-3xl font-black uppercase tracking-tighter">Team Management</h1>
                <p class="text-xs font-bold opacity-40 uppercase tracking-widest mt-1" v-if="activeOrg">
                    Orchestrating {{ activeOrg.name }} Intelligence Unit
                </p>
            </div>
            <div class="flex gap-4">
                <el-button @click="fetchOrganizations" :loading="loading" class="glass-btn">Sync Teams</el-button>
                <el-button type="primary" @click="showCreateDialog = true" class="create-btn px-8">Establish New
                    Team</el-button>
            </div>
        </header>

        <div v-if="activeOrg" class="org-layout grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Main Panel: Members -->
            <div class="lg:col-span-2 space-y-6">
                <el-card class="member-card cinematic-panel">
                    <template #header>
                        <div class="flex justify-between items-center">
                            <span class="text-xs font-black uppercase tracking-widest opacity-60">VTuber Members
                                Registry</span>
                            <el-button type="primary" plain bg round size="small"
                                @click="showInviteDialog = true">Invite Specialist</el-button>
                        </div>
                    </template>

                    <div class="cinematic-table">
                        <div v-for="member in activeOrg.members" :key="member.userId"
                            class="member-row flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/2 transition-all">
                            <div class="flex items-center gap-4">
                                <el-avatar :size="40" class="border border-white/10" />
                                <div>
                                    <p class="text-sm font-bold">{{ member.userId }}</p>
                                    <p class="text-[10px] opacity-40 uppercase font-black">{{ member.role }}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-[10px] opacity-30 italic">Joined {{ new
                                    Date(member.joinedAt).toLocaleDateString()
                                }}</span>
                                <el-dropdown trigger="click" @command="(cmd) => handleMemberAction(cmd, member)">
                                    <button class="icon-btn-sm"><more-one theme="outline" size="14" /></button>
                                    <template #dropdown>
                                        <el-dropdown-menu>
                                            <el-dropdown-item command="change-role">Modify Access
                                                Level</el-dropdown-item>
                                            <el-dropdown-item command="remove" class="text-red-500">Revoke
                                                Membership</el-dropdown-item>
                                        </el-dropdown-menu>
                                    </template>
                                </el-dropdown>
                            </div>
                        </div>
                    </div>
                </el-card>

                <!-- Pending Invitations -->
                <el-card v-if="pendingInvites.length > 0" class="member-card cinematic-panel">
                    <template #header>
                        <span class="text-xs font-black uppercase tracking-widest opacity-60">Pending Tactical
                            Commissions</span>
                    </template>
                    <div class="cinematic-table">
                        <div v-for="invite in pendingInvites" :key="invite._id"
                            class="member-row flex items-center justify-between p-4 border-b border-white/5 opacity-60">
                            <div class="flex items-center gap-4">
                                <div
                                    class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-dashed border-white/20">
                                    <mail theme="outline" size="18" />
                                </div>
                                <div>
                                    <p class="text-sm font-bold">{{ invite.email }}</p>
                                    <p class="text-[10px] opacity-40 uppercase font-black">{{ invite.role }} (Pending)
                                    </p>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-[10px] opacity-30 italic">Expires {{ new
                                    Date(invite.expiresAt).toLocaleDateString()
                                }}</span>
                                <button
                                    class="text-[10px] text-red-500 font-black uppercase hover:underline">Revoke</button>
                            </div>
                        </div>
                    </div>
                </el-card>
            </div>

            <!-- Sidebar: Stats & Branding -->
            <div class="space-y-6">
                <!-- Organization Switcher if multiple -->
                <el-card v-if="organizations.length > 1" class="stat-card cinematic-panel">
                    <template #header>
                        <span class="text-xs font-black uppercase tracking-widest opacity-60">Active Context</span>
                    </template>
                    <div class="p-2">
                        <el-select v-model="activeOrg._id" @change="handleOrgSwitch" class="w-full">
                            <el-option v-for="org in organizations" :key="org._id" :label="org.name" :value="org._id" />
                        </el-select>
                    </div>
                </el-card>

                <!-- Seat Usage -->
                <el-card class="stat-card cinematic-panel">
                    <template #header>
                        <span class="text-xs font-black uppercase tracking-widest opacity-60">Intelligence Seats</span>
                    </template>
                    <div class="p-4 text-center">
                        <el-progress type="dashboard"
                            :percentage="(activeOrg.members.length / activeOrg.settings.maxMembers) * 100"
                            :color="activeOrg.branding?.primaryColor || '#3b82f6'" :stroke-width="12" />
                        <p class="text-2xl font-black mt-4">{{ activeOrg.members.length }} / {{
                            activeOrg.settings.maxMembers }}</p>
                        <p class="text-[9px] opacity-40 uppercase font-black mt-1">Specialists Engaged</p>
                    </div>
                </el-card>

                <!-- Org Branding Quick Actions -->
                <el-card class="stat-card cinematic-panel">
                    <template #header>
                        <span class="text-xs font-black uppercase tracking-widest opacity-60">Identity Shield</span>
                    </template>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                            <span class="text-[10px] font-bold uppercase">Public Discovery</span>
                            <el-switch v-model="activeOrg.settings.publicDiscovery" />
                        </div>
                        <div
                            class="flex justify-between items-center bg-white/5 p-3 rounded-xl text-blue-400 cursor-pointer hover:bg-white/10">
                            <span class="text-[10px] font-bold uppercase">Customize Graphics</span>
                            <graphic-design theme="outline" size="14" />
                        </div>
                    </div>
                </el-card>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!loading" class="empty-state py-20 text-center glass-card border-dashed">
            <peoples theme="outline" size="48" class="mx-auto mb-4 opacity-20" />
            <h2 class="text-xl font-bold">No High-Level Teams Found</h2>
            <p class="opacity-40 text-sm max-w-md mx-auto mt-2">Establish your first organization to invite
                collaborators and
                orchestrate multi-agent studio sessions.</p>
        </div>

        <!-- Dialog: Create Organization -->
        <el-dialog v-model="showCreateDialog" title="Project Intelligence Setup" width="500px" class="glass-dialog">
            <el-form label-position="top" :model="createForm">
                <el-form-item label="Organization Name">
                    <el-input v-model="createForm.name" :placeholder="'e.g. ' + uiStore.appName + ' Labs'" class="glass-input" />
                </el-form-item>
                <el-form-item label="Entity Identifier (Slug)">
                    <el-input v-model="createForm.slug" placeholder="labs" class="glass-input">
                        <template #prepend>{{ uiStore.domain.replace('https://', '').replace('http://', '') }}/org/</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="Strategic Mission (Description)">
                    <el-input v-model="createForm.description" type="textarea"
                        placeholder="Describe the focus of this unit..." class="glass-input" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showCreateDialog = false" class="glass-btn">Cancel</el-button>
                <el-button type="primary" @click="handleCreate" :loading="creating" class="create-btn">Initialize
                    Core</el-button>
            </template>
        </el-dialog>

        <!-- Dialog: Invite Member -->
        <el-dialog v-model="showInviteDialog" title="Recruit New Specialist" width="500px" class="glass-dialog">
            <el-form label-position="top" :model="inviteForm">
                <el-form-item label="Specialist Email">
                    <el-input v-model="inviteForm.email" :placeholder="'e.g. agent@' + uiStore.appName.toLowerCase().replace(/\s+/g, '') + '.ai'" class="glass-input" />
                </el-form-item>
                <el-form-item label="Access Level">
                    <el-select v-model="inviteForm.role" placeholder="Select role" class="glass-input">
                        <el-option label="Producer" value="producer" />
                        <el-option label="Editor" value="editor" />
                        <el-option label="Synthesizer" value="synthesizer" />
                    </el-select>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showInviteDialog = false" class="glass-btn">Cancel</el-button>
                <el-button type="primary" @click="handleInvite" :loading="inviting" class="create-btn">Dispatch
                    Invitation</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUIStore } from '@/stores/ui';
import { Peoples, MoreOne, GraphicDesign, Mail } from '@icon-park/vue-next';
import { useOrganizationStore } from '@/stores/organization';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';

const uiStore = useUIStore();

const creators = ref<any[]>([]); // local creators if needed, or from store
const showCreateDialog = ref(false);
const showInviteDialog = ref(false);
const creating = ref(false);
const inviting = ref(false);

// Use storeToRefs for reactive store connection
const orgStore = useOrganizationStore();
const { organizations, activeOrg, loading, invitations } = storeToRefs(orgStore);
const pendingInvites = computed(() => invitations.value.filter((i: any) => i.status === 'pending'));

const createForm = ref({
    name: '',
    slug: '',
    description: ''
});

const inviteForm = ref({
    email: '',
    role: 'editor'
});

const fetchOrganizations = async () => {
    await orgStore.fetchOrganizations();
    if (orgStore.activeOrg) {
        await orgStore.fetchInvitations(orgStore.activeOrg._id);
    }
};


const handleCreate = async () => {
    creating.value = true;
    try {
        await orgStore.createOrganization(createForm.value);
        showCreateDialog.value = false;
        // Store updates list automatically
    } catch (e: any) {
        // Error handled in store
    } finally {
        creating.value = false;
    }
};

const handleInvite = async () => {
    if (!activeOrg.value) return;
    inviting.value = true;
    try {
        await orgStore.sendInvite(activeOrg.value._id, inviteForm.value);
        showInviteDialog.value = false;
        inviteForm.value = { email: '', role: 'editor' };
        // Store updates invitations
    } catch (e: any) {
        // Handled in store
    } finally {
        inviting.value = false;
    }
};

const handleOrgSwitch = (orgId: string) => {
    activeOrg.value = organizations.value.find((o: any) => o._id === orgId);
    orgStore.fetchInvitations(orgId);
    toast.info(`Context switched to ${activeOrg.value?.name}`);
};

const handleMemberAction = (cmd: string, member: any) => {
    toast.info(`Executing Action: ${cmd} on specialist ${member.userId}`);
};

onMounted(fetchOrganizations);
</script>

<style scoped lang="scss">
.organization-view {
    min-height: 100vh;
    background: radial-gradient(circle at top right, rgba(139, 92, 246, 0.05), transparent 40%);
}

.cinematic-panel {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 32px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
}

.create-btn {
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    border: none;
    box-shadow: 0 10px 20px rgba(109, 40, 217, 0.2);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 15px 30px rgba(109, 40, 217, 0.3);
    }
}

.glass-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #fff;

    &:hover {
        background: rgba(255, 255, 255, 0.08);
    }
}

.icon-btn-sm {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #fff;
    cursor: pointer;
    transition: 0.2s;
    @include flex-center;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
}

.member-row {
    &:last-child {
        border-bottom: none;
    }
}

:deep(.el-progress) {
    .el-progress__text {
        color: #fff !important;
        font-weight: 900;
        font-size: 24px !important;
    }
}
</style>
