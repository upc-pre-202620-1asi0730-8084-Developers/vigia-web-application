import {ROLES} from "../../shared/presentation/navigation.config.js";

// Lazy-loaded components
const inventoryOverview = () => import('./views/inventory-overview.vue');

const inventoryManagementRoutes = [
    {   path: '/materiales',   name: 'inventory',   component: inventoryOverview,   meta: {titleKey: 'pageTitles.materials', roles: [ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER]}}
];

export default inventoryManagementRoutes;
