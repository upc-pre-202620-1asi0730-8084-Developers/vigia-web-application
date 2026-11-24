const IssuesListView = () => import('./views/issues-list-view.vue')
const IssueDetailView = () => import('./views/issue-detail-view.vue')

export const discrepancyRoutes = [
    {
        path: '/problemas',
        name: 'problemas',
        component: IssuesListView,
        meta: {
            titleKey: 'pageTitles.issues'
        }
    },
    {
        path: '/problemas/:id',
        name: 'problema-detalle',
        component: IssueDetailView,
        meta: {
            titleKey: 'pageTitles.issue_details'
        }
    }
]