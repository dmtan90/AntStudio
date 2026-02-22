<template>
  <div class="admin-users min-h-screen bg-[#0a0a0c] text-white font-outfit p-8 animate-in fade-in duration-700">
    <div class="page-header flex flex-col md:flex-row justify-between items-end gap-6 mb-12 relative z-10">
      <div>
        <h1 class="text-5xl font-black tracking-tighter mb-2 relative inline-block">
           User Registry
           <div class="absolute -bottom-2 left-0 w-1/3 h-1.5 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
        </h1>
        <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 mt-4 pl-1">Global Identity Management</p>
      </div>

      <div class="relative group w-full md:w-auto md:max-w-md">
        <search class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size="18" />
        <input 
           v-model="search" 
           @input="handleSearch"
           placeholder="Search identity matrix..." 
           class="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all shadow-lg"
        />
      </div>
    </div>

    <div class="users-content relative z-10">
      <div v-if="loading" class="space-y-4">
          <div v-for="i in 8" :key="i" class="h-20 bg-white/5 rounded-2xl animate-pulse"></div>
      </div>

      <div v-else class="cinematic-table-container bg-white/[0.02] rounded-[2rem] border border-white/5 overflow-hidden backdrop-blur-sm">
        <div class="cinematic-table-header px-8 py-6 border-b border-white/5 bg-white/[0.02] hidden md:grid grid-cols-12 gap-4">
          <div class="col-span-4 text-[9px] font-black uppercase tracking-widest text-gray-500">Identity / Profile</div>
          <div class="col-span-2 text-[9px] font-black uppercase tracking-widest text-gray-500">Role Access</div>
          <div class="col-span-2 text-[9px] font-black uppercase tracking-widest text-gray-500">Subscription</div>
          <div class="col-span-2 text-[9px] font-black uppercase tracking-widest text-gray-500 text-center">Status</div>
          <div class="col-span-2 text-[9px] font-black uppercase tracking-widest text-gray-500 text-right">Actions</div>
        </div>

        <div class="cinematic-table-body">
          <div v-for="user in users" :key="user._id" 
               class="cinematic-row px-8 py-5 border-b border-white/5 last:border-0 hover:bg-white/[0.04] transition-colors md:grid grid-cols-12 gap-4 items-center group">
            
            <div class="col-span-4 flex items-center gap-4">
               <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-xs font-black text-gray-400 group-hover:text-white group-hover:border-white/20 transition-all flex-shrink-0 overflow-hidden">
                  <GMedia v-if="user.avatar" :src="user.avatar" class="w-full h-full object-cover" />
                  <span v-else>{{ user.name.charAt(0) }}</span>
               </div>
               <div class="min-w-0">
                  <p class="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">{{ user.name }}</p>
                  <p class="text-[10px] font-bold opacity-30 uppercase tracking-wide truncate">{{ user.email }}</p>
               </div>
            </div>

            <div class="col-span-2">
              <span :class="['px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border', 
                 user.role === 'admin' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-gray-400']">
                 {{ user.role }}
              </span>
            </div>

            <div class="col-span-2">
              <span class="text-xs font-bold text-blue-400 tracking-wide">{{ user.subscription?.plan?.toUpperCase() || 'FREE' }}</span>
            </div>

            <div class="col-span-2 text-center pointer-events-auto" @click.stop>
               <el-switch
                v-model="user.isActive"
                style="--el-switch-on-color: #10b981; --el-switch-off-color: #ef4444"
                @change="(val) => handleStatusChange(user._id, val as boolean)"
              />
            </div>

            <div class="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors" @click="viewDetails(user._id)" title="View Details">
                  <doc-detail theme="outline" size="16" />
               </button>
               <button class="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors" @click="deleteUser(user._id)" title="Delete User">
                  <delete theme="outline" size="16" />
               </button>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination flex justify-center mt-12">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          layout="prev, pager, next"
          :total="total"
          class="glass-pagination"
          @current-change="fetchUsers"
        />
      </div>
    </div>

    <!-- Ambient Glow -->
    <div class="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

    <UserDetailDialog v-model="showDetailDialog" :userId="selectedUserId" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { DocDetail, Delete, Loading, Search } from '@icon-park/vue-next'
import { toast } from 'vue-sonner'
import UserDetailDialog from '@/components/admin/UserDetailDialog.vue'
import GMedia from '@/components/ui/GMedia.vue'
import { useAdminStore } from '@/stores/admin'
import { storeToRefs } from 'pinia'

const adminStore = useAdminStore()
const { users, loading } = storeToRefs(adminStore)

const search = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const fetchUsers = async () => {
  try {
    const response = await adminStore.fetchUsers({ 
        page: page.value, 
        limit: pageSize.value, 
        search: search.value 
    })
    total.value = response.total
  } catch (error) {
    toast.error('Failed to load users')
  }
}

const handleSearch = () => {
  page.value = 1
  fetchUsers()
}

const handleStatusChange = async (userId: string, active: boolean) => {
  try {
    await adminStore.updateUser(userId, { isActive: active })
    toast.success(`User ${active ? 'activated' : 'deactivated'} successfully`)
  } catch (error) {
    toast.error('Failed to update user status')
  }
}

const showDetailDialog = ref(false)
const selectedUserId = ref<string | null>(null)

const viewDetails = (userId: string) => {
  selectedUserId.value = userId
  showDetailDialog.value = true
}

const deleteUser = (userId: string) => {
  ElMessageBox.confirm('Are you sure you want to delete this user? This action is irreversible.', 'Warning', {
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel',
    type: 'warning',
    customClass: 'glass-message-box'
  }).then(async () => {
    try {
      await adminStore.deleteUser(userId)
      toast.success('User deleted successfully')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }).catch(() => {})
}

onMounted(fetchUsers)
</script>

<style lang="scss" scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}

:global(.glass-pagination button),
:global(.glass-pagination li) {
   background: transparent !important; 
   color: #666;
}
:global(.glass-pagination li.is-active) {
   color: #3b82f6; 
   font-weight: 900;
}

:global(.glass-message-box) {
   background: rgba(20, 20, 25, 0.95) !important;
   backdrop-filter: blur(24px) !important;
   border: 1px solid rgba(255, 255, 255, 0.1) !important;
   border-radius: 24px !important;
   
   .el-message-box__title { color: white !important; font-family: 'Outfit', sans-serif; }
   .el-message-box__message { color: #aaa !important; }
}
</style>
