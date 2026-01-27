<template>
   <div class="developer-hub p-6 animate-in">
      <header class="page-header mb-10 flex justify-between items-start">
         <div>
            <h1 class="text-3xl font-black text-white tracking-tight mb-2">Developer Hub</h1>
            <p class="text-gray-400">Manage programmatic access and real-time event notifications.</p>
         </div>
         <div class="flex items-center gap-4">
            <span
               class="text-[10px] font-black px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full uppercase">API
               V1.0 - ACTIVE</span>
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
                     <key-one theme="outline" /> API Key Management
                  </h2>
                  <button class="primary-btn px-6 py-2.5 text-[10px] font-black rounded-xl" @click="showGenKey = true">+
                     GENERATE NEW KEY</button>
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
                           <p class="text-[8px] font-black opacity-30 uppercase mb-0.5">Last Used</p>
                           <p class="text-[10px] font-bold">{{ key.lastUsedAt ? new
                              Date(key.lastUsedAt).toLocaleString() : 'Never' }}</p>
                        </div>
                        <button class="text-red-500/40 hover:text-red-500 transition-colors"
                           @click="revokeKey(key._id)"><delete-one size="18" /></button>
                     </div>
                  </div>
                  <div v-if="apiKeys.length === 0 && !loading" class="text-center py-10 opacity-20">
                     <key-one theme="outline" size="48" class="mx-auto mb-4" />
                     <p class="text-xs font-black uppercase tracking-widest">No active tactical keys found</p>
                  </div>
               </div>
            </section>

            <section class="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <!-- Webhooks -->
               <div class="glass-card p-8 rounded-3xl border border-white/5" v-loading="loading">
                  <div class="flex justify-between items-center mb-8">
                     <h2 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <connection-point theme="outline" /> Webhook Endpoints
                     </h2>
                     <button class="secondary-btn px-4 py-2 text-[10px] font-black border border-white/5"
                        @click="showAddWebhook = true">+ ADD URL</button>
                  </div>
                  <div class="space-y-4">
                     <div v-for="sub in webhooks" :key="sub._id"
                        class="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-3">
                        <div class="flex justify-between">
                           <code class="text-[10px] text-blue-400 font-mono">{{ sub.url }}</code>
                           <button @click="deleteWebhook(sub._id)"
                              class="text-[8px] font-black text-red-500/40 hover:text-red-500 uppercase">Revoke</button>
                        </div>
                        <div class="flex gap-2">
                           <span v-for="ev in sub.events" :key="ev"
                              class="px-2 py-0.5 bg-black/40 rounded text-[8px] font-black opacity-40 uppercase">{{ ev
                              }}</span>
                        </div>
                     </div>
                     <div v-if="webhooks.length === 0 && !loading" class="text-center py-6 opacity-20">
                        <p class="text-[10px] font-black uppercase">No active event subscriptions</p>
                     </div>
                  </div>
               </div>

               <!-- Quick Start Docs -->
               <div class="glass-card p-8 rounded-3xl border border-white/5 bg-blue-600/[0.03]">
                  <h2 class="text-sm font-black uppercase tracking-widest mb-6">Headless Integration</h2>
                  <div class="space-y-6">
                     <div class="doc-block">
                        <p class="text-[10px] font-black opacity-30 uppercase mb-2">Authenticating requests</p>
                        <div class="p-4 bg-black/60 rounded-xl font-mono text-[10px] leading-relaxed">
                           <span class="text-purple-400">curl</span> -X GET <span
                              class="text-blue-400">"https://api.antflow.ai/api/projects"</span> \<br />
                           &nbsp;&nbsp;-H <span class="text-green-400">"x-api-key: ant_8a2d...91fc"</span>
                        </div>
                     </div>
                     <div class="doc-block">
                        <p class="text-[10px] font-black opacity-30 uppercase mb-2">Verifying Webhooks</p>
                        <p class="text-[10px] text-gray-500 leading-relaxed italic">All requests from AntFlow include an
                           <span class="text-white">x-antflow-signature</span> header based on your Webhook Secret.</p>
                     </div>
                  </div>
               </div>
            </section>
         </div>
      </div>

      <!-- Dialog: Generate Key -->
      <el-dialog v-model="showGenKey" title="AUTHORIZE NEW MISSION" width="400px" custom-class="glass-dialog">
         <el-form label-position="top">
            <el-form-item label="Internal Identifier (Name)">
               <el-input v-model="keyForm.name" placeholder="e.g. Acme Production Hub" class="glass-input" />
            </el-form-item>
         </el-form>
         <template #footer>
            <el-button @click="showGenKey = false" class="glass-btn">Abort</el-button>
            <el-button type="primary" :loading="generating" @click="handleGenerateKey" class="create-btn">Initialize
               Token</el-button>
         </template>
      </el-dialog>

      <!-- Dialog: Add Webhook -->
      <el-dialog v-model="showAddWebhook" title="SUBSCRIBE TO MISSION EVENTS" width="500px" custom-class="glass-dialog">
         <el-form label-position="top">
            <el-form-item label="Destination URL">
               <el-input v-model="webhookForm.url" placeholder="https://hooks.yourdomain.com/events"
                  class="glass-input" />
            </el-form-item>
            <el-form-item label="Target Tactical Events">
               <el-checkbox-group v-model="webhookForm.events">
                  <el-checkbox label="ai.job.completed" />
                  <el-checkbox label="stream.started" />
                  <el-checkbox label="project.created" />
                  <el-checkbox label="credits.low" />
               </el-checkbox-group>
            </el-form-item>
         </el-form>
         <template #footer>
            <el-button @click="showAddWebhook = false" class="glass-btn">Cancel</el-button>
            <el-button type="primary" @click="handleAddWebhook" class="create-btn">Establish Subscription</el-button>
         </template>
      </el-dialog>

      <!-- Key Success Dialog -->
      <el-dialog v-model="showNewKeyDialog" title="NEW API KEY GENERATED" width="500px" custom-class="glass-dialog">
         <div class="py-6 text-center">
            <div
               class="w-16 h-16 bg-blue-500/10 rounded-2xl border border-blue-500/20 mx-auto flex items-center justify-center text-blue-400 mb-6 animate-pulse">
               <key theme="outline" size="32" />
            </div>
            <p class="text-gray-400 text-xs mb-8 mx-10">Make sure to copy this key now. For security reasons, <span
                  class="text-white font-bold">it will never be shown again.</span></p>

            <div class="p-4 bg-black border border-white/10 rounded-xl flex items-center gap-4 group">
               <code class="flex-1 text-blue-400 font-mono text-sm break-all text-left">{{ rawKey }}</code>
               <button class="action-btn px-4 py-2 text-[10px] font-black" @click="copyRawKey">COPY</button>
            </div>
         </div>
         <template #footer>
            <div class="px-4 pb-4">
               <button class="primary-btn w-full py-4 text-xs font-black uppercase"
                  @click="showNewKeyDialog = false">Strategic Token Stored</button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { KeyOne, Key, DeleteOne, ConnectionPoint, Search } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import axios from 'axios';

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

const fetchData = async () => {
   loading.value = true;
   try {
      const [{ data: keys }, { data: hooks }] = await Promise.all([
         axios.get('/api/developer/keys'),
         axios.get('/api/developer/webhooks')
      ]);
      apiKeys.value = keys.data;
      webhooks.value = hooks.data;
   } catch (e) {
      toast.error("Telemetry failure: Failed to sync developer assets");
   } finally {
      loading.value = false;
   }
};

const handleGenerateKey = async () => {
   generating.value = true;
   try {
      const { data } = await axios.post('/api/developer/keys', keyForm.value);
      if (data.success) {
         rawKey.value = data.data.rawKey;
         showGenKey.value = false;
         showNewKeyDialog.value = true;
         keyForm.value.name = '';
         fetchData();
      }
   } catch (e: any) {
      toast.error(e.response?.data?.error || "Strategic error generating token");
   } finally {
      generating.value = false;
   }
};

const revokeKey = async (id: string) => {
   try {
      await axios.delete(`/api/developer/keys/${id}`);
      toast.success("Tactical access revoked.");
      fetchData();
   } catch (e) {
      toast.error("Failed to revoke access token.");
   }
};

const handleAddWebhook = async () => {
   try {
      const { data } = await axios.post('/api/developer/webhooks', webhookForm.value);
      if (data.success) {
         toast.success("Event subscription established.");
         showAddWebhook.value = false;
         webhookForm.value = { url: '', events: ['ai.job.completed'] };
         fetchData();
      }
   } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to subscribe to events");
   }
};

const deleteWebhook = async (id: string) => {
   try {
      await axios.delete(`/api/developer/webhooks/${id}`);
      toast.success("Subscription terminated.");
      fetchData();
   } catch (e) {
      toast.error("Failed to terminate subscription.");
   }
};

const copyRawKey = () => {
   navigator.clipboard.writeText(rawKey.value);
   toast.success("Tactical credential copied to clipboard!");
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
