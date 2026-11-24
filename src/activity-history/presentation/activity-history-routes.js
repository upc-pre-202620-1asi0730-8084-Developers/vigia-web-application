import {ROLES} from "../../shared/presentation/navigation.config.js";

// Lazy-loaded components
const activityLog = () => import('./views/activity-log.vue');

const activityHistoryRoutes = [
    {   path: '/historial',   name: 'history',   component: activityLog,   meta: {titleKey: 'pageTitles.audit_log', roles: [ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER, ROLES.SITE_MANAGER]}}
];

export default activityHistoryRoutes;
