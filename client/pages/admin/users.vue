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
      <!-- Desktop Table View -->
      <GTable
        :loading="loading"
        :data="users"
        style="width: 100%"
      >
        <el-table-column prop="name" label="Name" />
        <el-table-column prop="email" label="Email" />
        <el-table-column prop="role" label="Role" />
        <el-table-column prop="plan" label="Plan" />
        <el-table-column prop="status" label="Status" />
        <el-table-column prop="joined" label="Joined" />
        <el-table-column prop="actions" label="Actions" />
      </GTable>
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
                <div class="avatar-sm">{{ user.name.charAt(0) }}</div>
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
                @change="(val) => handleStatusChange(user._id, val)"
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

      <!-- Mobile Card View -->
      <div class="responsive-grid">
        <div v-for="user in users" :key="user._id" class="user-card-item cinematic-card">
          <div class="card-top">
             <div class="user-cell">
                <div class="avatar-sm">{{ user.name.charAt(0) }}</div>
                <div class="user-info">
                  <div class="name">{{ user.name }}</div>
                  <div class="email-sub">{{ user.email }}</div>
                </div>
              </div>
              <el-tag :type="user.role === 'admin' ? 'danger' : 'info'" size="small" effect="dark">{{ user.role }}</el-tag>
          </div>
          <div class="card-details">
             <div class="detail-row">
               <span>Plan</span>
               <el-tag effect="plain" size="small" class="plan-tag">{{ user.subscription?.plan?.toUpperCase() || 'FREE' }}</el-tag>
             </div>
             <div class="detail-row">
               <span>Status</span>
               <el-switch
                v-model="user.isActive"
                size="small"
                style="--el-switch-on-color: #10b981; --el-switch-off-color: #ef4444"
                @change="(val) => handleStatusChange(user._id, val)"
              />
             </div>
             <div class="detail-row">
                <span>Joined</span>
                <span>{{ new Date(user.createdAt).toLocaleDateString() }}</span>
             </div>
          </div>
          <div class="card-actions">
            <el-button class="flex-1" @click="viewDetails(user._id)">View Details</el-button>
            <el-button type="danger" plain @click="deleteUser(user._id)">Delete</el-button>
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
import UserDetailDialog from '~/components/admin/UserDetailDialog.vue'

definePageMeta({
  layout: 'app',
  middleware: ['admin']
})

const users = ref([])
const loading = ref(true)
const search = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const fetchUsers = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('auth-token')
    const data = await $fetch(`/api/admin/users?page=${page.value}&search=${search.value}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    users.value = (data as any).users
    total.value = (data as any).total
  } catch (error) {
    toast.error('Failed to load users', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  fetchUsers()
}

const handleStatusChange = async (userId: string, active: boolean) => {
  try {
    const token = localStorage.getItem('auth-token')
    await $fetch(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: { isActive: active }
    })
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
      const token = localStorage.getItem('auth-token')
      await $fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('User deleted successfully')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to delete user')
    }
  })
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
    .email-sub { font-size: 12px; color: $text-muted; }
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
    color: $text-secondary;
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
  color: $text-secondary;
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
  
  .el-icon { font-size: 24px; color: $primary-color; }
}

// Mobile Responsive
.responsive-grid {
  display: none;
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
               color: $text-muted;
               font-size: 12px;
             }
           }
        }
     }
  }
}
</style>
