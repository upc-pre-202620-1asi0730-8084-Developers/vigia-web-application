import {ROLES} from "../../shared/presentation/navigation.config.js";

// Lazy-loaded components
const projectList = () => import('./views/project-list.vue');

const projectManagementRoutes = [
    {   path: '/obras',   name: 'projects',   component: projectList,   meta: {titleKey: 'pageTitles.job_sites', roles: [ROLES.ADMIN, ROLES.SITE_MANAGER]}}
];

export default projectManagementRoutes;
