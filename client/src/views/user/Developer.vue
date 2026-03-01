<template>
   <div class="developer-hub p-6 animate-in">
      <header class="page-header mb-10 flex justify-between items-start">
         <div>
            <h1 class="text-3xl font-black text-white tracking-tight mb-2">{{ t('developer.title') }}</h1>
            <p class="text-gray-400">{{ t('developer.subtitle') }}</p>
         </div>
         <div class="flex items-center gap-4">
            <span
               class="text-[10px] font-black px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full uppercase">
               {{ t('developer.apiVersion') }}
            </span>
         </div>
      </header>

      <div class="grid grid-cols-12 gap-8">
         <!-- LEFT: Key Management -->
         <div class="col-span-12 lg:col-span-12 space-y-8">
            <section
               class="glass-card p-8 rounded-3xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent overflow-hidden relative"
               v-loading="loading">
               <div
                  class="absolute top-[-20%] right-[-10%] w-[40%] h-[120%] bg-blue-500/5 blur-[100px] pointer-events-none">
               </div>

               <div class="flex justify-between items-center mb-8">
                  <h2 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                     <key-one theme="outline" /> {{ t('developer.keys.title') }}
                  </h2>
                  <button class="primary-btn px-6 py-2.5 text-[10px] font-black rounded-xl" @click="showGenKey = true">+
                     {{ t('developer.keys.generate') }}</button>
               </div>

               <div class="space-y-4">
                  <div v-for="key in apiKeys" :key="key._id"
                     class="key-item p-6 bg-black/40 border border-white/5 rounded-2xl flex justify-between items-center group hover:border-blue-500/30 transition-all">
                     <div class="flex items-center gap-6">
                        <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                           <key theme="outline" />
                        </div>
                        <div>
                           <p class="text-xs font-bold mb-0.5">{{ key.name }}</p>
                           <code class="text-[10px] font-mono opacity-40">{{ key.keyPreview }}</code>
                        </div>
                     </div>
                     <div class="flex items-center gap-8">
                        <div class="text-right">
                           <p class="text-[8px] font-black opacity-30 uppercase mb-0.5">{{ t('developer.keys.lastUsed') }}</p>
                           <p class="text-[10px] font-bold">{{ key.lastUsedAt ? formatDate(key.lastUsedAt) : t('developer.keys.never') }}</p>
                        </div>
                        <button class="text-red-500/40 hover:text-red-500 transition-colors"
                           @click="revokeKey(key._id)"><delete-one size="18" /></button>
                     </div>
                  </div>
                  <div v-if="apiKeys.length === 0 && !loading" class="text-center py-10 opacity-20">
                     <key-one theme="outline" size="48" class="mx-auto mb-4" />
                     <p class="text-xs font-black uppercase tracking-widest">{{ t('developer.keys.empty') }}</p>
                  </div>
               </div>
            </section>

            <section class="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <!-- Webhooks -->
               <div class="glass-card p-8 rounded-3xl border border-white/5" v-loading="loading">
                  <div class="flex justify-between items-center mb-8">
                     <h2 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <connection-point theme="outline" /> {{ t('developer.webhooks.title') }}
                     </h2>
                     <button class="secondary-btn px-4 py-2 text-[10px] font-black border border-white/5"
                        @click="showAddWebhook = true">+ {{ t('developer.webhooks.add') }}</button>
                  </div>
                  <div class="space-y-4">
                     <div v-for="sub in webhooks" :key="sub._id"
                        class="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-3">
                        <div class="flex justify-between">
                           <code class="text-[10px] text-blue-400 font-mono">{{ sub.url }}</code>
                           <button @click="deleteWebhook(sub._id)"
                              class="text-[8px] font-black text-red-500/40 hover:text-red-500 uppercase">{{ t('developer.webhooks.revoke') }}</button>
                        </div>
                        <div class="flex gap-2">
                           <span v-for="ev in sub.events" :key="ev"
                              class="px-2 py-0.5 bg-black/40 rounded text-[8px] font-black opacity-40 uppercase">{{ ev
                              }}</span>
                        </div>
                     </div>
                     <div v-if="webhooks.length === 0 && !loading" class="text-center py-6 opacity-20">
                        <p class="text-[10px] font-black uppercase">{{ t('developer.webhooks.empty') }}</p>
                     </div>
                  </div>
               </div>

               <!-- Quick Start Docs -->
               <div class="glass-card p-8 rounded-3xl border border-white/5 bg-blue-600/[0.03]">
                  <h2 class="text-sm font-black uppercase tracking-widest mb-6">{{ t('developer.headless.title') }}</h2>
                  <div class="space-y-6">
                     <div class="doc-block">
                        <p class="text-[10px] font-black opacity-30 uppercase mb-2">{{ t('developer.headless.auth') }}</p>
                        <div class="p-4 bg-black/60 rounded-xl font-mono text-[10px] leading-relaxed">
                           <span class="text-purple-400">curl</span> -X GET <span
                              class="text-blue-400">"{{ uiStore.domain }}/api/projects"</span> \<br />
                           &nbsp;&nbsp;-H <span class="text-green-400">"x-api-key: {{ uiStore.appName.toLowerCase().replace(/\s+/g, '_') }}_8a2d...91fc"</span>
                        </div>
                     </div>
                     <div class="doc-block">
                        <p class="text-[10px] font-black opacity-30 uppercase mb-2">{{ t('developer.headless.verify') }}</p>
                        <p class="text-[10px] text-gray-500 leading-relaxed italic">
                           {{ t('developer.headless.verifyDesc', { appName: uiStore.appName, header: uiStore.appName.toLowerCase().replace(/\s+/g, '-') }) }}
                        </p>
                     </div>
                  </div>
               </div>
            </section>
         </div>
      </div>

      <!-- Dialog: Generate Key -->
      <el-dialog v-model="showGenKey" :title="t('developer.keys.dialog.title')" width="400px" custom-class="glass-dialog">
         <el-form label-position="top">
            <el-form-item :label="t('developer.keys.dialog.label')">
               <el-input v-model="keyForm.name" :placeholder="t('developer.keys.dialog.placeholder')" class="glass-input" />
            </el-form-item>
         </el-form>
         <template #footer>
            <el-button @click="showGenKey = false" class="glass-btn">{{ t('developer.keys.dialog.abort') }}</el-button>
            <el-button type="primary" :loading="generating" @click="handleGenerateKey" class="create-btn">{{ t('developer.keys.dialog.initialize') }}</el-button>
         </template>
      </el-dialog>

      <!-- Dialog: Add Webhook -->
      <el-dialog v-model="showAddWebhook" :title="t('developer.webhooks.dialog.title')" width="500px" custom-class="glass-dialog">
         <el-form label-position="top">
            <el-form-item :label="t('developer.webhooks.dialog.urlLabel')">
               <el-input v-model="webhookForm.url" :placeholder="t('developer.webhooks.dialog.urlPlaceholder')"
                  class="glass-input" />
            </el-form-item>
            <el-form-item :label="t('developer.webhooks.dialog.eventsLabel')">
               <el-checkbox-group v-model="webhookForm.events">
                  <el-checkbox label="ai.job.completed" />
                  <el-checkbox label="stream.started" />
                  <el-checkbox label="project.created" />
                  <el-checkbox label="credits.low" />
               </el-checkbox-group>
            </el-form-item>
         </el-form>
         <template #footer>
            <el-button @click="showAddWebhook = false" class="glass-btn">{{ t('developer.webhooks.dialog.cancel') }}</el-button>
            <el-button type="primary" @click="handleAddWebhook" class="create-btn">{{ t('developer.webhooks.dialog.establish') }}</el-button>
         </template>
      </el-dialog>

      <!-- Key Success Dialog -->
      <el-dialog v-model="showNewKeyDialog" :title="t('developer.keys.success.title')" width="500px" custom-class="glass-dialog">
         <div class="py-6 text-center">
            <div
               class="w-16 h-16 bg-blue-500/10 rounded-2xl border border-blue-500/20 mx-auto flex items-center justify-center text-blue-400 mb-6 animate-pulse">
               <key theme="outline" size="32" />
            </div>
            <p class="text-gray-400 text-xs mb-8 mx-10">{{ t('developer.keys.success.warning') }}</p>

            <div class="p-4 bg-black border border-white/10 rounded-xl flex items-center gap-4 group">
               <code class="flex-1 text-blue-400 font-mono text-sm break-all text-left">{{ rawKey }}</code>
               <button class="action-btn px-4 py-2 text-[10px] font-black" @click="copyRawKey">{{ t('developer.keys.success.copy') }}</button>
            </div>
         </div>
         <template #footer>
            <div class="px-4 pb-4">
               <button class="primary-btn w-full py-4 text-xs font-black uppercase"
                  @click="showNewKeyDialog = false">{{ t('developer.keys.success.stored') }}</button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUIStore } from '@/stores/ui';
import { KeyOne, Key, DeleteOne, ConnectionPoint, Search } from '@icon-park/vue-next';
import { useDeveloperStore } from '@/stores/developer';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const uiStore = useUIStore();

const loading = ref(false);
const generating = ref(false);
const apiKeys = ref<any[]>([]);
const webhooks = ref<any[]>([]);

const showGenKey = ref(false);
const showAddWebhook = ref(false);
const showNewKeyDialog = ref(false);
const rawKey = ref('');

const keyForm = ref({ name: '' });
const webhookForm = ref({ url: '', events: ['ai.job.completed'] });

const devStore = useDeveloperStore();

const fetchData = async () => {
   loading.value = true;
   try {
      await Promise.all([
         devStore.fetchKeys(),
         devStore.fetchWebhooks()
      ]);
      apiKeys.value = devStore.keys;
      webhooks.value = devStore.webhooks;
   } catch (e) {
      toast.error(t('developer.toasts.syncFailed'));
   } finally {
      loading.value = false;
   }
};

const handleGenerateKey = async () => {
   generating.value = true;
    try {
       const data = await devStore.createKey({ name: keyForm.value.name, scopes: ['all'] });
       if (data) {
          rawKey.value = data.apiKey; // Using data.apiKey as per common response
          showGenKey.value = false;
          showNewKeyDialog.value = true;
          keyForm.value.name = '';
          apiKeys.value = devStore.keys;
       }
   } catch (e: any) {
      toast.error(e.response?.data?.error || t('developer.toasts.genFailed'));
   } finally {
      generating.value = false;
   }
};

const revokeKey = async (id: string) => {
   try {
      await devStore.deleteKey(id);
      toast.success(t('developer.toasts.revoked'));
      // update local
      apiKeys.value = devStore.keys;
   } catch (e) {
      toast.error(t('developer.toasts.revokeFailed'));
   }
};

const handleAddWebhook = async () => {
   try {
      const data = await devStore.createWebhook(webhookForm.value);
      if (data) {
         toast.success(t('developer.toasts.webhookEstablished'));
         showAddWebhook.value = false;
         webhookForm.value = { url: '', events: ['ai.job.completed'] };
         // update local
         webhooks.value = devStore.webhooks;
      }
   } catch (e: any) {
      toast.error(e.response?.data?.error || t('developer.toasts.webhookFailed'));
   }
};

const deleteWebhook = async (id: string) => {
   try {
      await devStore.deleteWebhook(id);
      toast.success(t('developer.toasts.webhookTerminated'));
      // update local
      webhooks.value = devStore.webhooks;
   } catch (e) {
      toast.error(t('developer.toasts.terminateFailed'));
   }
};

const copyRawKey = () => {
   navigator.clipboard.writeText(rawKey.value);
   toast.success(t('developer.toasts.copySuccess'));
};

const formatDate = (date: string) => {
    return new Date(date).toLocaleString(t('common.locale') === 'vi' ? 'vi-VN' : 'en-US');
};

onMounted(fetchData);
</script>

<style lang="scss" scoped>
.developer-hub {
   min-height: 100vh;
   background: radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.05), transparent 40%);
}

.glass-card {
   backdrop-filter: blur(40px);
   background: rgba(255, 255, 255, 0.02);
}

.primary-btn {
   background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
   color: white;
   border: none;
   transition: 0.3s;

   &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
   }
}

.secondary-btn {
   background: rgba(255, 255, 255, 0.03);
   color: white;
   transition: 0.3s;

   &:hover {
      background: rgba(255, 255, 255, 0.08);
   }
}

.action-btn {
   background: rgba(59, 130, 246, 0.1);
   color: #3b82f6;
   border: 1px solid rgba(59, 130, 246, 0.2);
   border-radius: 8px;
   transition: 0.2s;

   &:hover {
      background: #3b82f6;
      color: white;
   }
}

.create-btn {
   background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
   border: none;
   font-weight: 900;
   text-transform: uppercase;
   letter-spacing: 1px;

   &:hover {
      transform: translateY(-2px);
   }
}
</style>
