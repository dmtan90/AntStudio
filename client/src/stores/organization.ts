import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api.js'
import { toast } from 'vue-sonner'

export const useOrganizationStore = defineStore('organization', () => {
    const organizations = ref<any[]>([])
    const activeOrg = ref<any>(null)
    const invitations = ref<any[]>([])
    const loading = ref(false)

    async function fetchOrganizations() {
        loading.value = true
        try {
            const { data } = await api.get('/organizations')
            organizations.value = data.organizations || []
            if (organizations.value.length > 0 && !activeOrg.value) {
                activeOrg.value = organizations.value[0]
            }
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch organizations')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function createOrganization(payload: any) {
        try {
            const { data } = await api.post('/organizations', payload)
            toast.success('Organization created')
            await fetchOrganizations()
            return data
        } catch (error: any) {
            toast.error(error.message || 'Failed to create organization')
            throw error
        }
    }

    async function acceptInviteByToken(token: string) {
        try {
            const res = await api.post('/organizations/accept-invite', { token });
            // toast success handled by caller or here
            return res.data;
        } catch (error: any) {
            throw error;
        }
    }

    async function fetchInvitations(orgId: string) {
        try {
            const { data } = await api.get(`/organizations/${orgId}/invitations`)
            invitations.value = data.invitations || []
            return data
        } catch (error: any) {
            console.error('Failed to fetch invitations', error)
        }
    }

    async function sendInvite(orgId: string, payload: { email: string, role: string }) {
        try {
            await api.post(`/organizations/${orgId}/invitations`, payload)
            toast.success('Invitation sent')
            await fetchInvitations(orgId)
        } catch (error: any) {
            toast.error(error.message || 'Failed to send invitation')
            throw error
        }
    }

    async function acceptInvite(token: string) {
        try {
            await api.post('/organizations/accept-invite', { token })
            toast.success('Invitation accepted')
            await fetchOrganizations()
        } catch (error: any) {
            toast.error(error.message || 'Failed to accept invitation')
            throw error
        }
    }

    // Onboarding specific - often uses direct endpoints or specialized owner registration
    async function registerOwner(payload: any) {
        try {
            await api.post('/auth/register-owner', payload)
        } catch (error: any) {
            throw error
        }
    }

    return {
        organizations,
        activeOrg,
        invitations,
        loading,
        fetchOrganizations,
        createOrganization,
        fetchInvitations,
        sendInvite,
        acceptInvite,
        registerOwner
    }
})
