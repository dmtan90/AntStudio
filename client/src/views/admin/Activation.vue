<template>
  <div class="activation-view flex items-center justify-center p-6 min-h-[80vh]">
    <div class="activation-card glass-card p-10 rounded-[2.5rem] border border-white/10 max-w-xl w-full text-center relative overflow-hidden">
      <!-- Background Glow -->
      <div class="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full"></div>
      <div class="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/20 blur-[100px] rounded-full"></div>

      <div class="relative z-10">
        <div class="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
           <key theme="outline" size="40" class="text-blue-400" />
        </div>

        <h1 class="text-3xl font-black text-white uppercase tracking-tighter mb-2">Initialize AntStudio</h1>
        <p class="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-10">VTuber Hub Activation & Compliance</p>

        <div v-if="licenseStore.isValid" class="success-state animate-in">
           <div class="p-6 bg-green-500/10 border border-green-500/20 rounded-3xl mb-8">
              <p class="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">Core Status: ACTIVE</p>
              <h2 class="text-xl font-black text-white uppercase">Welcome, {{ licenseStore.tier }} Partner</h2>
              <p class="text-xs text-white/40 mt-2 font-medium">Full system capabilities have been unlocked.</p>
           </div>
           
           <el-button class="glass-btn w-full py-6 uppercase font-black tracking-widest" @click="$router.push('/admin/overview')">
             Go to Dashboard
           </el-button>
        </div>

        <el-form v-else class="space-y-6" @submit.prevent="handleActivate">
           <div class="form-item text-left">
              <label class="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4 mb-2 block">License Key</label>
              <el-input 
                v-model="keyInput" 
                placeholder="XXXX-XXXX-XXXX-XXXX" 
                class="premium-input"
                :prefix-icon="Key"
              />
           </div>

           <el-button 
             type="primary" 
             class="activate-btn w-full py-7 uppercase font-black tracking-[0.3em] text-xs" 
             :loading="activating"
             @click="handleActivate"
           >
             Connect to Hub
           </el-button>

           <p class="text-[9px] text-white/20 font-bold uppercase tracking-widest leading-relaxed px-8">
             By activating, you agree to the AntStudio Enterprise EULA and compliance standards.
           </p>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Key } from '@icon-park/vue-next';
import { useLicenseStore } from '@/stores/license';
import { useAdminStore } from '@/stores/admin';
import { toast } from 'vue-sonner';

const licenseStore = useLicenseStore();
const adminStore = useAdminStore();
const keyInput = ref('');
const activating = ref(false);

onMounted(() => {
    licenseStore.fetchLicenseStatus();
});

const handleActivate = async () => {
    if (!keyInput.value) {
        toast.error("Please enter a valid license key");
        return;
    }

    activating.value = true;
    try {
        // We update the settings which triggers a license check on the backend
        await adminStore.updateSettings({
            license: { key: keyInput.value }
        });
        
        await licenseStore.fetchLicenseStatus();
        
        if (licenseStore.isValid) {
            toast.success("System activated successfully!");
        } else {
            toast.error("Activation failed. Port blocked or key invalid.");
        }
    } catch (e: any) {
        toast.error(e.response?.data?.error || "VTuber Handshake Failure");
    } finally {
        activating.value = false;
    }
};
</script>

<style lang="scss" scoped>
.activation-view {
  background: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05), transparent 70%);
}

.activation-card {
  background: rgba(10, 10, 10, 0.8);
  backdrop-filter: blur(40px);
}

.premium-input {
  :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    box-shadow: none !important;
    border-radius: 1.25rem;
    padding: 12px 20px;
    height: auto;
    
    &.is-focus {
      border-color: rgba(59, 130, 246, 0.5) !important;
      background: rgba(59, 130, 246, 0.05) !important;
    }
  }

  :deep(.el-input__inner) {
    color: white !important;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    letter-spacing: 2px;
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.1);
      letter-spacing: 1px;
    }
  }
}

.activate-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 1.25rem;
  box-shadow: 0 10px 40px rgba(37, 99, 235, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 20px 50px rgba(37, 99, 235, 0.4);
  }

  &:active {
    transform: scale(0.98);
  }
}

.glass-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 1.25rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.animate-in {
  animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
