<template>
  <div class="landing-page bg-[#030308] text-white selection:bg-blue-500 selection:text-white font-sans min-h-screen">
    <!-- Main Hero Section -->
    <LandingHero />

    <div class="divider h-[1px] w-full bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>

    <!-- Core Capabilities Showcase -->
    <section id="features" class="py-28 relative overflow-hidden bg-[#05050f]">
      <!-- Background Glows -->
      <div class="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-600/10 blur-[160px] pointer-events-none"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 blur-[160px] pointer-events-none"></div>

      <div class="container mx-auto px-6 relative z-10">
        <!-- Section Header -->
        <header class="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
            {{ $t('marketing.features.tag') }}
          </div>
          <h2 class="text-4xl sm:text-5xl font-black text-white leading-tight" v-html="$t('marketing.features.title')"></h2>
          <p class="text-gray-400 text-lg leading-relaxed">
            {{ $t('marketing.features.desc') }}
          </p>
        </header>

        <!-- Feature Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <!-- Feature 1: Autonomous Sales FSM -->
          <div class="feature-box group p-8 rounded-[32px] bg-white/[0.03] border border-white/10 hover:border-blue-500/40 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1">
            <div class="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <cpu size="28" />
            </div>
            <h3 class="text-xl font-black text-white mb-3">{{ $t('marketing.features.fsm.title') }}</h3>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              {{ $t('marketing.features.fsm.desc') }}
            </p>
            <div class="inline-flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <span>{{ $t('marketing.features.fsm.link') }}</span>
              <arrow-right size="14" />
            </div>
          </div>

          <!-- Feature 2: Ultra-low Latency Voice & Lip Sync -->
          <div class="feature-box group p-8 rounded-[32px] bg-white/[0.03] border border-white/10 hover:border-purple-500/40 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1">
            <div class="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <broadcast size="28" />
            </div>
            <h3 class="text-xl font-black text-white mb-3">{{ $t('marketing.features.speech.title') }}</h3>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              {{ $t('marketing.features.speech.desc') }}
            </p>
            <div class="inline-flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
              <span>{{ $t('marketing.features.speech.link') }}</span>
              <arrow-right size="14" />
            </div>
          </div>

          <!-- Feature 3: Multi-Platform RTMP & WebRTC Push -->
          <div class="feature-box group p-8 rounded-[32px] bg-white/[0.03] border border-white/10 hover:border-pink-500/40 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1">
            <div class="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-6 group-hover:scale-110 transition-transform">
              <video-two size="28" />
            </div>
            <h3 class="text-xl font-black text-white mb-3">{{ $t('marketing.features.multicast.title') }}</h3>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              {{ $t('marketing.features.multicast.desc') }}
            </p>
            <div class="inline-flex items-center gap-2 text-xs font-bold text-pink-400 uppercase tracking-wider">
              <span>{{ $t('marketing.features.multicast.link') }}</span>
              <arrow-right size="14" />
            </div>
          </div>

          <!-- Feature 4: Product Knowledge Base & AI Script Generator -->
          <div class="feature-box group p-8 rounded-[32px] bg-white/[0.03] border border-white/10 hover:border-amber-500/40 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1">
            <div class="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <shopping-bag size="28" />
            </div>
            <h3 class="text-xl font-black text-white mb-3">{{ $t('marketing.features.catalog.title') }}</h3>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              {{ $t('marketing.features.catalog.desc') }}
            </p>
            <div class="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <span>{{ $t('marketing.features.catalog.link') }}</span>
              <arrow-right size="14" />
            </div>
          </div>

          <!-- Feature 5: Dynamic Commerce Overlays & Scannable QR -->
          <div class="feature-box group p-8 rounded-[32px] bg-white/[0.03] border border-white/10 hover:border-green-500/40 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1">
            <div class="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 mb-6 group-hover:scale-110 transition-transform">
              <lightning size="28" />
            </div>
            <h3 class="text-xl font-black text-white mb-3">{{ $t('marketing.features.overlays.title') }}</h3>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              {{ $t('marketing.features.overlays.desc') }}
            </p>
            <div class="inline-flex items-center gap-2 text-xs font-bold text-green-400 uppercase tracking-wider">
              <span>{{ $t('marketing.features.overlays.link') }}</span>
              <arrow-right size="14" />
            </div>
          </div>

          <!-- Feature 6: Real-time Engagement & Viral Peak clipping -->
          <div class="feature-box group p-8 rounded-[32px] bg-white/[0.03] border border-white/10 hover:border-cyan-500/40 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1">
            <div class="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <chart-histogram size="28" />
            </div>
            <h3 class="text-xl font-black text-white mb-3">{{ $t('marketing.features.analytics.title') }}</h3>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              {{ $t('marketing.features.analytics.desc') }}
            </p>
            <div class="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <span>{{ $t('marketing.features.analytics.link') }}</span>
              <arrow-right size="14" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Studio Production & Creation Workflows Showcase (ProjectCreationDialog options) -->
    <section id="creation-workflows" class="py-24 relative overflow-hidden bg-[#04040c] border-t border-white/10">
      <!-- Background Glow Effects -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 blur-[180px] pointer-events-none"></div>

      <div class="container mx-auto px-6 relative z-10">
        <!-- Section Header -->
        <header class="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest">
            {{ $t('projects.new.title') }}
          </div>
          <h2 class="text-4xl sm:text-5xl font-black text-white leading-tight">
            {{ $t('marketing.projects.headline') || "6 Specialized AI Video Production Workflows" }}
          </h2>
          <p class="text-gray-400 text-lg leading-relaxed">
            {{ $t('projects.new.subtitle') }}
          </p>
        </header>

        <!-- 6 Workflows Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <!-- Workflow 1: Script-to-Video AI Engine -->
          <div class="workflow-card group p-8 rounded-[32px] bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-purple-500/40 transition-all duration-500 hover:-translate-y-1 backdrop-blur-xl">
            <div class="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <magic-wand size="28" />
            </div>
            <h3 class="text-xl font-black text-white mb-3">{{ $t('marketing.projects.new.options.aiVideo.label') }}</h3>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              {{ $t('marketing.projects.new.options.aiVideo.desc') }}
            </p>
            <button class="inline-flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider group-hover:text-purple-300 transition-colors cursor-pointer" @click="$router.push('/projects')">
              <span>{{ $t('marketing.projects.new.options.aiVideo.button') || "Launch AI Engine" }}</span>
              <arrow-right size="14" />
            </button>
          </div>

          <!-- Workflow 2: AI Digital Personas & Avatars -->
          <div class="workflow-card group p-8 rounded-[32px] bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-blue-500/40 transition-all duration-500 hover:-translate-y-1 backdrop-blur-xl">
            <div class="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <user size="28" />
            </div>
            <h3 class="text-xl font-black text-white mb-3">{{ $t('marketing.projects.new.options.aiAvatar.label') }}</h3>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              {{ $t('marketing.projects.new.options.aiAvatar.desc') }}
            </p>
            <button class="inline-flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider group-hover:text-blue-300 transition-colors cursor-pointer" @click="$router.push('/projects')">
              <span>{{ $t('marketing.projects.new.options.aiAvatar.button') || "Create AI Personas" }}</span>
              <arrow-right size="14" />
            </button>
          </div>

          <!-- Workflow 3: E-Commerce Product Ads Wizard -->
          <div class="workflow-card group p-8 rounded-[32px] bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-emerald-500/40 transition-all duration-500 hover:-translate-y-1 backdrop-blur-xl">
            <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <link-icon size="28" />
            </div>
            <h3 class="text-xl font-black text-white mb-3">{{ $t('marketing.projects.new.options.productAds.label') }}</h3>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              {{ $t('marketing.projects.new.options.productAds.desc') }}
            </p>
            <button class="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider group-hover:text-emerald-300 transition-colors cursor-pointer" @click="$router.push('/projects')">
              <span>{{ $t('marketing.projects.new.options.productAds.button') || "Convert URL to Ad" }}</span>
              <arrow-right size="14" />
            </button>
          </div>

          <!-- Workflow 4: 24/7 Autonomous Sale Studio -->
          <div class="workflow-card group p-8 rounded-[32px] bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-pink-500/40 transition-all duration-500 hover:-translate-y-1 backdrop-blur-xl">
            <div class="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-6 group-hover:scale-110 transition-transform">
              <shopping-cart size="28" />
            </div>
            <h3 class="text-xl font-black text-white mb-3">{{ $t('marketing.projects.new.options.saleStudio.label') }}</h3>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              {{ $t('marketing.projects.new.options.saleStudio.desc') }}
            </p>
            <button class="inline-flex items-center gap-2 text-xs font-bold text-pink-400 uppercase tracking-wider group-hover:text-pink-300 transition-colors cursor-pointer" @click="$router.push('/projects')">
              <span>{{ $t('marketing.projects.new.options.saleStudio.button') || "Open Sale Studio" }}</span>
              <arrow-right size="14" />
            </button>
          </div>

          <!-- Workflow 5: Screen & Camera Recorder Studio -->
          <div class="workflow-card group p-8 rounded-[32px] bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-red-500/40 transition-all duration-500 hover:-translate-y-1 backdrop-blur-xl">
            <div class="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 group-hover:scale-110 transition-transform">
              <camera size="28" />
            </div>
            <h3 class="text-xl font-black text-white mb-3">{{ $t('marketing.projects.new.options.record.label') }}</h3>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              {{ $t('marketing.projects.new.options.record.desc') }}
            </p>
            <button class="inline-flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider group-hover:text-red-300 transition-colors cursor-pointer" @click="$router.push('/projects')">
              <span>{{ $t('marketing.projects.new.options.record.button') || "Start Recording" }}</span>
              <arrow-right size="14" />
            </button>
          </div>

          <!-- Workflow 6: Multi-Track Canvas & Timeline Studio -->
          <div class="workflow-card group p-8 rounded-[32px] bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-cyan-500/40 transition-all duration-500 hover:-translate-y-1 backdrop-blur-xl">
            <div class="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <plus size="28" />
            </div>
            <h3 class="text-xl font-black text-white mb-3">{{ $t('marketing.projects.new.options.blank.label') }}</h3>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              {{ $t('marketing.projects.new.options.blank.desc') }}
            </p>
            <button class="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider group-hover:text-cyan-300 transition-colors cursor-pointer" @click="$router.push('/projects')">
              <span>{{ $t('marketing.projects.new.options.blank.button') || "Open Timeline Studio" }}</span>
              <arrow-right size="14" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Deep Dive Showcase: SaleStudio Experience -->
    <section id="ai-streamer" class="py-28 relative bg-[#030308] overflow-hidden">
      <div class="container mx-auto px-6 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <!-- Text left -->
          <div class="lg:col-span-5 space-y-6">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[10px] font-black uppercase tracking-widest">
              {{ $t('marketing.showcase.tag') }}
            </div>
            <h3 class="text-4xl font-black text-white leading-tight">
              {{ $t('marketing.showcase.title') }}
            </h3>
            <p class="text-gray-400 text-base leading-relaxed">
              {{ $t('marketing.showcase.desc') }}
            </p>

            <ul class="space-y-4 pt-2">
              <li class="flex items-start gap-3 text-sm text-gray-300">
                <check-one size="18" class="text-blue-400 mt-0.5 shrink-0" />
                <span><strong>{{ $t('marketing.showcase.item1Title') }}</strong> {{ $t('marketing.showcase.item1Desc') }}</span>
              </li>
              <li class="flex items-start gap-3 text-sm text-gray-300">
                <check-one size="18" class="text-purple-400 mt-0.5 shrink-0" />
                <span><strong>{{ $t('marketing.showcase.item2Title') }}</strong> {{ $t('marketing.showcase.item2Desc') }}</span>
              </li>
              <li class="flex items-start gap-3 text-sm text-gray-300">
                <check-one size="18" class="text-pink-400 mt-0.5 shrink-0" />
                <span><strong>{{ $t('marketing.showcase.item3Title') }}</strong> {{ $t('marketing.showcase.item3Desc') }}</span>
              </li>
            </ul>

            <div class="pt-4">
              <button 
                class="primary-btn px-8 py-4 text-xs font-black uppercase tracking-widest rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20 hover:scale-105 transition-all cursor-pointer"
                @click="$router.push('/live/sales')"
              >
                {{ $t('marketing.showcase.cta') }}
              </button>
            </div>
          </div>

          <!-- Studio Mockup right -->
          <div class="lg:col-span-7">
            <div class="glass-box p-3 rounded-[36px] bg-white/[0.04] border border-white/15 shadow-2xl backdrop-blur-2xl">
              <div class="rounded-[28px] overflow-hidden bg-[#080812] border border-white/10 p-4 space-y-4">
                <!-- Top Mockup Header -->
                <div class="flex items-center justify-between border-b border-white/10 pb-3">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-red-500"></div>
                    <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div class="w-3 h-3 rounded-full bg-green-500"></div>
                    <span class="text-xs font-mono text-gray-400 ml-2">SaleStudio — AI Broadcast Control</span>
                  </div>
                  <span class="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono">HEALTH: 100% EXCELLENT</span>
                </div>

                <!-- Studio Mockup Body -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 aspect-video sm:aspect-auto">
                  <div class="sm:col-span-2 relative rounded-2xl overflow-hidden bg-black aspect-video border border-white/10">
                    <img src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" class="w-full h-full object-cover opacity-75" />
                    <div class="absolute top-3 left-3 px-2.5 py-1 bg-red-600 rounded-lg text-[9px] font-black uppercase text-white animate-pulse">● LIVE</div>
                    <div class="absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-black/80 backdrop-blur-md text-[10px] text-white/90 border border-white/10 font-mono">
                      [AI Persona]: "Check out this limited-time flash offer! Scan the QR code to buy now."
                    </div>
                  </div>

                  <div class="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-2 text-xs flex flex-col justify-between">
                    <div>
                      <div class="text-[9px] font-black uppercase text-gray-400 tracking-wider mb-2">Live Dialogue Feed</div>
                      <div class="space-y-1.5 font-mono text-[10px]">
                        <div class="p-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300">PITCH: Smart Camera</div>
                        <div class="p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">DISCOUNT: 30% OFF</div>
                        <div class="p-1.5 rounded bg-green-500/10 border border-green-500/20 text-green-300">TRIGGER: Flash Sale</div>
                      </div>
                    </div>
                    <div class="pt-2 border-t border-white/10 text-[9px] text-gray-400 font-mono">
                      FSM State: <span class="text-green-400 font-bold">PITCHING</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Enterprise B2B Showcase -->
    <section id="b2b-enterprise">
      <B2BShowcase />
    </section>

    <!-- Live Performance Metrics Banner -->
    <section id="live-metrics" class="py-16 bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 border-y border-white/10">
      <div class="container mx-auto px-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div class="space-y-1">
            <div class="text-4xl font-black text-white">99.9%</div>
            <div class="text-xs font-bold uppercase tracking-wider text-gray-400">{{ $t('marketing.metrics.uptime') }}</div>
          </div>
          <div class="space-y-1">
            <div class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">&lt; 50ms</div>
            <div class="text-xs font-bold uppercase tracking-wider text-gray-400">{{ $t('marketing.metrics.latency') }}</div>
          </div>
          <div class="space-y-1">
            <div class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">4+</div>
            <div class="text-xs font-bold uppercase tracking-wider text-gray-400">{{ $t('marketing.metrics.destinations') }}</div>
          </div>
          <div class="space-y-1">
            <div class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400">24/7</div>
            <div class="text-xs font-bold uppercase tracking-wider text-gray-400">{{ $t('marketing.metrics.selling') }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom Call to Action -->
    <section class="py-28 relative overflow-hidden bg-[#030308]">
      <div class="container mx-auto px-6 relative z-10 text-center max-w-4xl space-y-8">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest">
          {{ $t('marketing.bottomCta.tag') }}
        </div>
        <h2 class="text-5xl sm:text-6xl font-black text-white leading-tight">
          {{ $t('marketing.bottomCta.title') }}
        </h2>
        <p class="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto">
          {{ $t('marketing.bottomCta.desc') }}
        </p>

        <div class="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button 
            class="primary-btn px-10 py-5 text-xs font-black uppercase tracking-widest rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl shadow-blue-500/30 hover:scale-105 transition-all cursor-pointer"
            @click="$router.push('/register')"
          >
            {{ $t('marketing.bottomCta.start') }}
          </button>
        </div>
      </div>
    </section>

    <!-- Corporate Footer -->
    <footer class="py-16 border-t border-white/10 bg-[#020205] text-gray-400 text-xs relative overflow-hidden">
      <div class="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-gray-600">
        <!-- <p>{{ $t('marketing.footer.rights', { appName: uiStore.appName || 'AntStudio' }) }}</p> -->
        <div class="flex flex-col gap-6">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden border border-white/20">
              <img v-if="uiStore.logo" :src="getFileUrl(uiStore.logo)" class="w-full h-full object-contain" />
              <camera-five v-else size="18" fill="#fff" />
            </div>
            <span class="text-lg font-black tracking-tight text-white uppercase">{{ uiStore.appName || 'AntStudio' }}</span>
          </div>
          <p class="text-xs text-gray-500 leading-relaxed">
            {{ $t('marketing.footer.brandDesc') }}
          </p>
        </div>
        <div class="flex gap-6">
          <button type="button" class="hover:text-gray-400 transition-colors cursor-pointer" @click="showPrivacyModal = true">{{ $t('marketing.footer.privacy') }}</button>
          <button type="button" class="hover:text-gray-400 transition-colors cursor-pointer" @click="showTermsModal = true">{{ $t('marketing.footer.terms') }}</button>
          <button type="button" class="hover:text-gray-400 transition-colors cursor-pointer" @click="openGitHub">GitHub</button>
        </div>
      </div>
    </footer>
  </div>
  <!-- Privacy & Terms Dialogs -->
  <el-dialog
    v-model="showPrivacyModal"
    :title="$t('marketing.privacy.title')"
    width="760px"
    align-center
    class="legal-modal-dialog"
    append-to-body
  >
    <Privacy :embedded="true" />
  </el-dialog>

  <el-dialog
    v-model="showTermsModal"
    :title="$t('marketing.terms.title')"
    width="760px"
    align-center
    class="legal-modal-dialog"
    append-to-body
  >
    <Terms :embedded="true" />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { CameraFive, Cpu, Broadcast, VideoTwo, ShoppingBag, Lightning, ChartHistogram, CheckOne, ArrowRight, MagicWand, User, Link as LinkIcon, ShoppingCart, Camera, Plus } from '@icon-park/vue-next';
import LandingHero from '@/components/marketing/LandingHero.vue';
import B2BShowcase from '@/components/marketing/B2BShowcase.vue';
import Privacy from './Privacy.vue'
import Terms from './Terms.vue'
import { useUIStore } from '@/stores/ui';
import { getFileUrl } from '@/utils/api';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const uiStore = useUIStore();
const scrolled = ref(false);
const activeSection = ref('overview')
const showPrivacyModal = ref(false)
const showTermsModal = ref(false)

const handleScroll = () => {
    scrolled.value = window.scrollY > 50;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);

  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        activeSection.value = entry.target.id
      }
    })
  }, observerOptions)

  document.querySelectorAll('section[id]').forEach((section) => {
    observer.observe(section)
  })
});

const openGitHub = () => {
  window.open('https://github.com/dmtan90/antstudio', '_blank');
}

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
});
</script>

<style lang="scss" scoped>
.primary-btn {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  &:hover {
    box-shadow: 0 15px 30px rgba(59, 130, 246, 0.3);
  }
}

.feature-box {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
