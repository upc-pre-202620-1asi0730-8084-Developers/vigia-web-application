import i18n from './i18n.js';
import {watch} from 'vue';
import {createRouter, createWebHashHistory} from "vue-router";
import useIamStore from "./iam/application/iam.store.js";
import iamRoutes from './iam/presentation/iam-routes.js';
import { ROLES, navigationItems } from "./shared/presentation/navigation.config.js";
import { discrepancyRoutes } from './discrepancy-and-evidence-management/presentation/discrepancy-routes.js'
import orderManagementRoutes from './order-management-and-distpatch/presentation/order-management-routes.js'
import projectManagementRoutes from './project-management/presentation/project-management-routes.js'
import dashboardRoutes from './dashboard/presentation/dashboard-routes.js'
import settingsRoutes from './iam/presentation/settings-routes.js'
import activityHistoryRoutes from './activity-history/presentation/activity-history-routes.js'
import inventoryManagementRoutes from './inventory-management/presentation/inventory-management-routes.js'

// Vistas
const pageNotFound = () => import('./shared/presentation/views/page-not-found.vue');
const transportView = () => import('./fleet-and-device-management/presentation/views/transport-view.vue');
const receptionManagementView = () => import('./site-reception-and-verification/presentation/views/reception-management-view.vue');
const vehicleRegisterForm = () => import('./fleet-and-device-management/presentation/views/vehicle-register-form.vue');
const vehiclePairDeviceForm = () => import('./fleet-and-device-management/presentation/views/vehicle-pair-device-form.vue');
const registerReceptionPage = () => import('./site-reception-and-verification/presentation/views/register-reception-page.vue');
const reportDiscrepancyPage = () => import('./site-reception-and-verification/presentation/views/report-discrepancy-page.vue');

const routes = [
    ...iamRoutes,

    ...discrepancyRoutes,
    ...orderManagementRoutes,
    ...projectManagementRoutes,
    ...dashboardRoutes,
    ...settingsRoutes,
    ...activityHistoryRoutes,
    ...inventoryManagementRoutes,
    {
        path: '/',
        redirect: '/inicio'
    },
    {
        path: '/transporte',
        name: 'transporte',
        component: transportView,
        meta: { titleKey: 'pageTitles.transportation_and_fleet', roles: [ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER] }
    },
    {
        path: '/transporte/unidades/nueva',
        name: 'vehicle-new',
        component: vehicleRegisterForm,
        meta: { titleKey: 'pageTitles.register_vehicle', roles: [ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER] }
    },
    {
        path: '/transporte/unidades/:id/gps',
        name: 'vehicle-pair-device',
        component: vehiclePairDeviceForm,
        meta: { titleKey: 'pageTitles.pair_gps_device', roles: [ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER] }
    },
    {
        path: '/recepciones',
        name: 'recepciones',
        component: receptionManagementView,
        meta: { titleKey: 'pageTitles.site_receptions', roles: [ROLES.ADMIN, ROLES.SITE_MANAGER] }
    },
    {
        path: '/recepciones/nueva',
        name: 'reception-new',
        component: registerReceptionPage,
        meta: { titleKey: 'pageTitles.register_reception', roles: [ROLES.ADMIN, ROLES.SITE_MANAGER] }
    },
    {
        path: '/recepciones/:id/discrepancia',
        name: 'reception-discrepancy',
        component: reportDiscrepancyPage,
        meta: { titleKey: 'pageTitles.report_discrepancy', roles: [ROLES.ADMIN, ROLES.SITE_MANAGER] }
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: pageNotFound,
        meta: { titleKey: 'pageTitles.page_not_found' }
    }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes: routes
});


router.beforeEach((to) => {
    const iamStore = useIamStore();
    if (!to.meta.public && !iamStore.isSignedIn) return {name: 'iam-sign-in'};
    if (to.meta.public && iamStore.isSignedIn) return '/inicio';

    // Si la ruta define roles permitidos, verificar que el rol activo tenga acceso
    if (to.meta && Array.isArray(to.meta.roles)) {
        if (!to.meta.roles.includes(iamStore.currentRole)) {
            console.warn(`Acceso denegado a ${to.path} para el rol ${iamStore.currentRole}`);
            // Redirigir a una ruta permitida para este rol
            const defaultAllowed = navigationItems.find(item => item.roles.includes(iamStore.currentRole));
            if (defaultAllowed && defaultAllowed.path !== to.path) {
                return { path: defaultAllowed.path };
            }
            return { path: '/inicio' };
        }
    }

    return true;
});

function updateTitle() {
    document.title = `Vigía - ${i18n.global.t(router.currentRoute.value.meta.titleKey || 'a11y.platform')}`;
}
router.afterEach((_to,_from,failure) => { if (!failure) updateTitle(); });
watch(() => i18n.global.locale.value, updateTitle);
export default router;

window.addEventListener('vigia:session-expired', () => useIamStore().signOut(router));
