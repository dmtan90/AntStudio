// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  srcDir: '.',
  devtools: { enabled: true },

  modules: [
    '@element-plus/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],

  components: [
    {
      path: '~/components/ui',
      pathPrefix: false,
    },
    '~/components',
  ],

  css: [
    'vue-sonner/style.css',
    '~/assets/scss/global.scss'
  ],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/_variables.scss" as *;\n@use "~/assets/scss/_mixins.scss" as *;'
        }
      }
    }
  },

  imports: {
    presets: [
      {
        from: 'vue-sonner',
        imports: ['toast']
      }
    ]
  },

  runtimeConfig: {
    // Private keys - only available server-side
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    awsRegion: process.env.AWS_REGION,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsS3Bucket: process.env.AWS_S3_BUCKET,
    awsS3Endpoint: process.env.AWS_S3_ENDPOINT,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiApiKeys: process.env.GEMINI_API_KEYS,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    smtpFromEmail: process.env.SMTP_FROM_EMAIL,
    smtpFromName: process.env.SMTP_FROM_NAME,
    youtubeClientId: process.env.YOUTUBE_CLIENT_ID,
    youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    youtubeRedirectUri: process.env.YOUTUBE_REDIRECT_URI,
    facebookAppId: process.env.FACEBOOK_APP_ID,
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
    facebookRedirectUri: process.env.FACEBOOK_REDIRECT_URI,

    // Gemini Models Config
    geminiModelTextAnalysis: process.env.GEMINI_MODEL_TEXT_ANALYSIS || 'gemini-3-flash-preview',
    geminiModelImageGeneration: process.env.GEMINI_MODEL_IMAGE_GENERATION || 'gemini-2.5-flash-image',
    geminiModelVideoGeneration: process.env.GEMINI_MODEL_VIDEO_GENERATION || 'veo-3.1-fast-generate-preview',
    geminiModelTts: process.env.GEMINI_MODEL_TTS || 'lyria-002',

    // Public keys - exposed to client
    public: {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      apiBase: process.env.API_BASE_URL || 'http://localhost:4000',
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    }
  },

  typescript: {
    strict: true,
    typeCheck: false
  },

  build: {
    transpile: ['vue-sonner']
  }
})
