<template>
  <div class="admin-licenses">
    <div class="page-header">
      <h1>License Management</h1>
      <button class="primary-btn" @click="showGenerateDialog = true">
         <plus theme="outline" size="20" />
         {{ t('common.generate') }}
      </button>
    </div>

    <div class="licenses-content">
      <div class="cinematic-table-container">
        <div class="cinematic-table-header">
          <div class="col key">KEY</div>
          <div class="col type">TYPE</div>
          <div class="col status">STATUS</div>
          <div class="col limits">LIMITS</div>
          <div class="col expiry">EXPIRY</div>
          <div class="col actions">ACTIONS</div>
        </div>

        <div v-if="loading" class="loading-state">
           <el-icon class="is-loading"><Loading /></el-icon>
        </div>

        <div v-else class="cinematic-table-body">
          <div v-for="license in licenses" :key="license._id" class="cinematic-row">
            <div class="col key">
              <div class="key-cell" :title="license.key">
                <key theme="outline" size="16" />
                <span class="key-text">{{ truncateKey(license.key) }}</span>
                <copy theme="outline" size="14" class="copy-btn" @click="copyToClipboard(license.key)" />
              </div>
            </div>
            <div class="col type">
              <span class="type-badge">{{ license.type.toUpperCase() }}</span>
            </div>
            <div class="col status">
               <span :class="['status-badge', license.status]">{{ license.status.toUpperCase() }}</span>
            </div>
            <div class="col limits">
              <div class="limit-info">
                 <span><user theme="outline" size="12" /> {{ license.maxUsers == -1 ? 'Unlimited' : license.maxUsers }}</span>
                 <span><folder-open theme="outline" size="12" /> {{ license.maxProjects == -1 ? 'Unlimited' : license.maxProjects }}</span>
              </div>
            </div>
            <div class="col expiry">
              {{ license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Never' }}
            </div>
            <div class="col actions">
               <button class="icon-btn delete" @click="handleDelete(license._id)" title="Revoke License">
                  <delete theme="outline" size="16" />
               </button>
            </div>
          </div>
          
          <div v-if="licenses.length === 0 && !loading" class="empty-state">
            No licenses found
          </div>
        </div>
      </div>
    </div>

    <!-- Generate License Dialog -->
    <el-dialog
      v-model="showGenerateDialog"
      title="Generate License"
      width="500px"
      class="cinematic-dialog"
    >
      <div class="form-container">
        <div class="form-item">
           <label>License Type</label>
           <el-select v-model="form.type" placeholder="Select type">
             <el-option label="Trial" value="trial" />
             <el-option label="Free" value="free" />
             <el-option label="Enterprise" value="enterprise" />
           </el-select>
        </div>
        
        <div class="form-row">
            <div class="form-item">
               <label>Max Users</label>
               <el-input-number v-model="form.maxUsers" :min="1" />
            </div>
            <div class="form-item">
               <label>Max Projects</label>
               <el-input-number v-model="form.maxProjects" :min="1" />
            </div>
        </div>

        <div class="form-item">
           <label>Expiration Date</label>
           <el-date-picker
             v-model="form.expiresAt"
             type="date"
             placeholder="Pick a date"
             style="width: 100%"
           />
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showGenerateDialog = false">Cancel</el-button>
          <el-button type="primary" :loading="generating" @click="handleGenerate">Generate</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { Plus, Key, Copy, User, FolderOpen, Delete, Loading } from '@icon-park/vue-next'
import { ElMessageBox } from 'element-plus'
import { toast } from 'vue-sonner'
import { useAdminStore } from '@/stores/admin'
import { storeToRefs } from 'pinia'
import { useTranslations } from '@/composables/useTranslations'

const { t } = useTranslations()
const adminStore = useAdminStore()
const { licenses, loading } = storeToRefs(adminStore)

const showGenerateDialog = ref(false)
const generating = ref(false)

const form = reactive({
    type: 'trial',
    maxUsers: 5,
    maxProjects: 10,
    expiresAt: null as Date | null
})

onMounted(() => {
    adminStore.fetchLicenses()
})

const truncateKey = (key: string) => {
    if (!key) return ''
    return key.substring(0, 8) + '...' + key.substring(key.length - 8)
}

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
}

const handleGenerate = async () => {
    generating.value = true
    try {
        await adminStore.generateLicense({
            type: form.type,
            maxUsers: form.maxUsers,
            maxProjects: form.maxProjects,
            expiresAt: form.expiresAt
        })
        showGenerateDialog.value = false
        // Reset form
        form.type = 'trial'
        form.maxUsers = 5
        form.maxProjects = 10
        form.expiresAt = null
    } catch (error) {
        // Error handled in store
    } finally {
        generating.value = false
    }
}

const handleDelete = (id: string) => {
    ElMessageBox.confirm('Are you sure you want to revoke this license?', 'Warning', {
        confirmButtonText: 'Revoke',
        cancelButtonText: 'Cancel',
        type: 'warning'
    }).then(async () => {
        await adminStore.deleteLicense(id)
    }).catch(() => {})
}
</script>

<style lang="scss" scoped>
.admin-licenses {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }
}

.primary-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  transition: all 0.2s;
  
  &:hover {
    background: #2563eb;
  }
}

.cinematic-table-container {
  width: 100%;
  overflow-x: auto;
  
  .cinematic-table-header {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
    padding: 16px 24px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    margin-bottom: 16px;
    
    .col {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      
      &.actions { text-align: right; }
    }
  }
  
  .cinematic-table-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .cinematic-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
    padding: 16px 24px;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    align-items: center;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-1px);
    }
    
    .col {
      color: #fff;
      font-size: 14px;
      
      &.actions { 
        display: flex;
        justify-content: flex-end;
      }
    }
  }
}

.key-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .key-text {
        font-family: monospace;
        color: #fbbf24;
    }
    
    .copy-btn {
        cursor: pointer;
        opacity: 0.5;
        transition: opacity 0.2s;
        
        &:hover { opacity: 1; }
    }
}

.type-badge {
    padding: 4px 10px;
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
}

.status-badge {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    
    &.valid {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
    }
    
    &.expired, &.invalid {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
    }
}

.limit-info {
    display: flex;
    gap: 12px;
    
    span {
        display: flex;
        align-items: center;
        gap: 4px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;
    }
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

.loading-state, .empty-state {
    padding: 40px;
    display: flex;
    justify-content: center;
    color: rgba(255, 255, 255, 0.5);
}

.form-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-row {
    display: flex;
    gap: 16px;
    
    .form-item { flex: 1; }
}

.form-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    label {
        font-size: 12px;
        font-weight: 600;
        color: #888;
        text-transform: uppercase;
    }
}
</style>
