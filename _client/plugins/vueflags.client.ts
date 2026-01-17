import VueFlags from '@singleway/vueflags'
// import { fileURLToPath } from 'url'

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.use(VueFlags, { iconPath: '/flags/' })
})
