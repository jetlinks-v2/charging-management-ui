import {createApp,h,watch} from 'vue'
import {createRouter,createWebHashHistory} from 'vue-router'
import Antd,{ConfigProvider} from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import 'ant-design-vue/dist/reset.css'
import './style.css'
import App from './App.vue'
import {attachHostBridge,clearSession,initializeConfig,state} from './services/session'
import {verifySession} from './hooks/useSession'
import {resetRooms,loadRooms} from './services/rooms'
const router=createRouter({history:createWebHashHistory(),routes:[
 {path:'/',component:()=>import('./views/HomePage.vue')},{path:'/login',component:()=>import('./views/LoginPage.vue')},
 {path:'/bills',component:()=>import('./views/BillsPage.vue')},{path:'/prepay',component:()=>import('./views/PrepayPage.vue')},
 {path:'/confirm',component:()=>import('./views/ConfirmPage.vue')},{path:'/result',redirect:'/confirm'},
 {path:'/wallet',component:()=>import('./views/WalletPage.vue')},{path:'/wallet/:id',component:()=>import('./views/EntriesPage.vue')},
 {path:'/records',component:()=>import('./views/RecordsPage.vue')},{path:'/profile',component:()=>import('./views/ProfilePage.vue')},
 {path:'/:pathMatch(.*)*',redirect:'/'},
]})
async function bootstrap(){
 await initializeConfig()
 router.beforeEach(async to=>{if(to.path==='/login')return true;if(!state.session)return'/login';if(!state.authorization){try{await verifySession()}catch{clearSession();return'/login'}}return true})
 watch(()=>state.session,session=>{resetRooms();if(session)void loadRooms()})
 router.afterEach((to,from)=>{if(from.path==='/login'&&to.path!==from.path&&!state.authorization)return;window.scrollTo(0,0)})
 attachHostBridge(async()=>{try{await verifySession();await loadRooms();await router.replace('/')}catch{clearSession();await router.replace('/login')}})
 window.addEventListener('finance-owner:session-expired',()=>void router.replace('/login'))
 createApp({render:()=>h(ConfigProvider,{locale:zhCN,theme:{token:{colorPrimary:'#0879bc',colorText:'#21394d',colorTextSecondary:'#526b7e',colorTextPlaceholder:'#526b7e',colorBorder:'#dbe7f0',borderRadius:12,fontSize:14,controlHeight:44}}},()=>h(App))}).use(Antd).use(router).mount('#app')
}
void bootstrap().catch(()=>{document.getElementById('app')!.textContent='应用配置加载失败，请检查 config.json 后刷新重试。'})
