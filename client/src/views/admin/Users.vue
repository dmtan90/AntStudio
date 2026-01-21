<template>
  <div class="admin-users">
    <div class="page-header">
      <h1>User Management</h1>
      <div class="actions">
        <el-input
          v-model="search"
          placeholder="Search by name or email"
          prefix-icon="search"
          style="width: 300px"
          @input="handleSearch"
        />
      </div>
    </div>

    <div class="users-content">
      <div class="cinematic-table-container">
        <div class="cinematic-table-header">
          <div class="col name">NAME</div>
          <div class="col role">ROLE</div>
          <div class="col plan">PLAN</div>
          <div class="col status">STATUS</div>
          <div class="col joined">JOINED</div>
          <div class="col actions">ACTIONS</div>
        </div>

        <div v-if="loading" class="loading-state">
           <el-icon class="is-loading"><Loading /></el-icon>
        </div>

        <div v-else class="cinematic-table-body">
          <div v-for="user in users" :key="user._id" class="cinematic-row">
            <div class="col name">
                <div class="user-cell">
                  <div class="avatar-sm">
                    <GMedia v-if="user.avatar" :src="user.avatar" class="w-full h-full rounded-full object-cover" />
                    <span v-else>{{ user.name.charAt(0) }}</span>
                  </div>
                  <div class="user-info">
                    <div class="name-text">{{ user.name }}</div>
                    <div class="email-sub">{{ user.email }}</div>
                  </div>
                </div>
            </div>
            <div class="col role">
              <span :class="['role-badge', user.role === 'admin' ? 'admin' : 'user']">{{ user.role }}</span>
            </div>
            <div class="col plan">
              <span class="plan-text">{{ user.subscription?.plan?.toUpperCase() || 'FREE' }}</span>
            </div>
            <div class="col status">
               <el-switch
                v-model="user.isActive"
                style="--el-switch-on-color: #10b981; --el-switch-off-color: #ef4444"
                @change="(val) => handleStatusChange(user._id, val as boolean)"
              />
            </div>
            <div class="col joined">
              {{ new Date(user.createdAt).toLocaleDateString() }}
            </div>
            <div class="col actions">
               <button class="icon-btn" @click="viewDetails(user._id)" title="View Details">
                  <doc-detail theme="outline" size="16" />
               </button>
               <button class="icon-btn delete" @click="deleteUser(user._id)" title="Delete User">
                  <delete theme="outline" size="16" />
               </button>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          layout="prev, pager, next"
          :total="total"
          @current-change="fetchUsers"
        />
      </div>
    </div>

    <UserDetailDialog v-model="showDetailDialog" :userId="selectedUserId" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { DocDetail, Delete, Loading } from '@icon-park/vue-next'
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
    type: 'warning'
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
// Cinematic Table Styles
.cinematic-table-container {
  width: 100%;
  overflow-x: auto;
  
  // Header
  .cinematic-table-header {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
    padding: 16px 24px;
    background: #fff;
    border-radius: 12px;
    margin-bottom: 16px;
    
    .col {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #000;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      
      &.actions { justify-content: flex-end; }
    }
  }
  
  // Body
  .cinematic-table-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .cinematic-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
    padding: 16px 24px;
    background: rgba(255, 255, 255, 0.05); // Glass effect
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    align-items: center;
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    
    .col {
      color: #fff;
      font-size: 14px;
      
      &.name { font-weight: 600; }
      &.actions { 
        display: flex; 
        justify-content: flex-end; 
        gap: 8px; 
      }
    }
  }
}

// Cell Components
.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .avatar-sm {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #333;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #fff;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .user-info {
    .name-text { font-weight: 600; font-size: 14px; color: #fff; }
    .email-sub { font-size: 12px; color: rgba(255, 255, 255, 0.4); }
  }
}

.role-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  
  &.admin {
    background: #ef4444;
    color: #fff;
    box-shadow: 0 2px 10px rgba(239, 68, 68, 0.3);
  }
  
  &.user {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.6);
  }
}

.plan-text {
  font-weight: 600;
  color: #3b82f6;
  font-size: 13px;
}

.icon-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  
  &.delete:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }
}

.loading-state {
  padding: 40px;
  display: flex;
  justify-content: center;
  
  .el-icon { font-size: 24px; color: #3b82f6; }
}

@media (max-width: 1024px) {
  .cinematic-table-container {
     .cinematic-table-header { display: none; }
     
     .cinematic-table-body .cinematic-row {
        grid-template-columns: 1fr;
        gap: 16px;
        padding: 20px;
        position: relative;
        
        .col {
           &.name { margin-bottom: 8px; }
           &.actions {
             position: absolute;
             top: 20px;
             right: 20px;
           }
           
           &.role, &.plan, &.status, &.joined {
             display: flex;
             justify-content: space-between;
             width: 100%;
             
             &::before {
               content: attr(class);
               text-transform: capitalize;
               color: rgba(255, 255, 255, 0.4);
               font-size: 12px;
             }
           }
        }
     }
  }
}
</style>
