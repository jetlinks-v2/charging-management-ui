import {createApp,h,watch} from 'vue'
import {createRouter,createWebHashHistory} from 'vue-router'
import {ConfigProvider,Button,Form,Field,CellGroup,Popup,Search,Tag,Loading,Empty,Icon,Tabs,Tab,NoticeBar} from 'vant'
import 'vant/lib/index.css'
import './style.css'
import App from './App.vue'
import {attachHostBridge,clearSession,initializeConfig,state} from './services/session'
import {resetRooms,loadRooms} from './services/rooms'
const router=createRouter({history:createWebHashHistory(),routes:[
 {path:'/',component:()=>import('./views/HomePage.vue')},{path:'/login',component:()=>import('./views/LoginPage.vue')},
 {path:'/applications',component:()=>import('./views/ApplicationsPage.vue')},
 {path:'/bills',component:()=>import('./views/BillsPage.vue')},{path:'/prepay',component:()=>import('./views/PrepayPage.vue')},
 {path:'/confirm',component:()=>import('./views/ConfirmPage.vue')},{path:'/result',redirect:'/confirm'},
 {path:'/wallet',component:()=>import('./views/WalletPage.vue')},{path:'/wallet/:id',component:()=>import('./views/EntriesPage.vue')},
 {path:'/records',component:()=>import('./views/RecordsPage.vue')},{path:'/profile',component:()=>import('./views/ProfilePage.vue')},
 {path:'/:pathMatch(.*)*',redirect:'/'},
]})
async function bootstrap(){
 await initializeConfig()
 router.beforeEach(to=>{
  if(to.path==='/login')return true
  if(!state.identity)return'/login'
  if(to.path==='/applications')return true
  if(!state.session||!state.ready)return'/applications'
  return true
 })
 watch(()=>state.ready?state.session:undefined,session=>{resetRooms();if(session)void loadRooms()},{flush:'sync'})
 router.afterEach(()=>window.scrollTo(0,0))
 attachHostBridge(async()=>{await router.replace('/applications')})
 window.addEventListener('finance-owner:session-expired',()=>void router.replace('/login'))
 const app=createApp({render:()=>h(ConfigProvider,{theme:'light'},()=>h(App))})
 for(const component of [Button,Form,Field,CellGroup,Popup,Search,Tag,Loading,Empty,Icon,Tabs,Tab,NoticeBar])app.use(component)
 app.use(router)
 // 刷新后的身份必须先经过应用列表和服务端范围验证，不能直接恢复业务页面。
 if(state.identity)await router.replace('/applications')
 app.mount('#app')
}
void bootstrap().catch(()=>{clearSession();document.getElementById('app')!.textContent='应用加载失败，请刷新重试。'})
