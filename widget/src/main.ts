
// Book Cover Generator — Vue app entry point

import {createApp} from 'vue'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'
import './styles.css'

// Mount the Vue app with Nuxt UI plugin registered
createApp(App).use(ui).mount('#app')
