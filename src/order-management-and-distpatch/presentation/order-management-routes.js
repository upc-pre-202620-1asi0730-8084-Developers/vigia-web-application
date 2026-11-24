import {ROLES} from "../../shared/presentation/navigation.config.js";

// Lazy-loaded components
const orderList = () => import('./views/order-list.vue');
const orderDetail = () => import('./views/order-detail.vue');
const dispatchList = () => import('./views/dispatch-list.vue');
const dispatchForm = () => import('./views/dispatch-form.vue');

const roles = [ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER];
const orderRoles = [...roles, ROLES.SITE_MANAGER];

const orderManagementRoutes = [
    {   path: '/despachos/:id/guia', name: 'ordering-dispatch-guide', component: () => import('./views/dispatch-guide.vue'), meta: {title: 'Guía de despacho', roles}},
    {   path: '/despachos/:id/pesaje', name: 'ordering-dispatch-weighing', component: () => import('./views/dispatch-weighing.vue'), meta: {title: 'Pesaje', roles}},
    {   path: '/solicitudes',       name: 'ordering-orders',        component: orderList,      meta: {title: 'Solicitudes', roles: orderRoles}},
    {   path: '/solicitudes/nueva', name: 'ordering-order-new', component: () => import('./views/order-form.vue'), meta: {title: 'Nuevo pedido', roles: [ROLES.ADMIN, ROLES.SITE_MANAGER]}},
    {   path: '/solicitudes/:id',   name: 'ordering-order-detail',  component: orderDetail,    meta: {title: 'Detalle de solicitud', roles: orderRoles}},
    {   path: '/despachos',         name: 'ordering-dispatches',    component: dispatchList,   meta: {title: 'Despachos', roles}},
    {   path: '/despachos/nuevo',   name: 'ordering-dispatch-new',  component: dispatchForm,   meta: {title: 'Nuevo despacho', roles}}
];

export default orderManagementRoutes;
