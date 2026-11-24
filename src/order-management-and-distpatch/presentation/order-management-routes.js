import {ROLES} from "../../shared/presentation/navigation.config.js";

// Lazy-loaded components
const orderList = () => import('./views/order-list.vue');
const orderDetail = () => import('./views/order-detail.vue');
const dispatchList = () => import('./views/dispatch-list.vue');
const dispatchForm = () => import('./views/dispatch-form.vue');

const roles = [ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER];
const orderRoles = [...roles, ROLES.SITE_MANAGER];

const orderManagementRoutes = [
    {path:'/despachos/:id/salida',name:'ordering-dispatch-departure',component:()=>import('../../transit-traceability/presentation/views/dispatch-departure.vue'),meta:{titleKey: 'pageTitles.start_trip',roles}},
    {   path: '/despachos/:id/guia', name: 'ordering-dispatch-guide', component: () => import('./views/dispatch-guide.vue'), meta: {titleKey: 'pageTitles.delivery_guide', roles}},
    {   path: '/despachos/:id/pesaje', name: 'ordering-dispatch-weighing', component: () => import('./views/dispatch-weighing.vue'), meta: {titleKey: 'pageTitles.weighing', roles}},
    {   path: '/solicitudes',       name: 'ordering-orders',        component: orderList,      meta: {titleKey: 'pageTitles.material_orders', roles: orderRoles}},
    {   path: '/solicitudes/nueva', name: 'ordering-order-new', component: () => import('./views/order-form.vue'), meta: {titleKey: 'pageTitles.new_order', roles: [ROLES.ADMIN, ROLES.SITE_MANAGER]}},
    {   path: '/solicitudes/:id',   name: 'ordering-order-detail',  component: orderDetail,    meta: {titleKey: 'pageTitles.order_details', roles: orderRoles}},
    {   path: '/despachos',         name: 'ordering-dispatches',    component: dispatchList,   meta: {titleKey: 'pageTitles.dispatches', roles}},
    {   path: '/despachos/nuevo',   name: 'ordering-dispatch-new',  component: dispatchForm,   meta: {titleKey: 'pageTitles.new_dispatch', roles}}
];

export default orderManagementRoutes;
