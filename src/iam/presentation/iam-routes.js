const signInForm = () => import('./views/sign-in-form.vue')
const signUpForm = () => import('./views/sign-up-form.vue')
const iamRoutes = [
    { path: '/iam/sign-in', name: 'iam-sign-in', component: signInForm, meta: { titleKey: 'pageTitles.sign_in', public: true } },
    { path: '/iam/sign-up', name: 'iam-sign-up', component: signUpForm, meta: { titleKey: 'pageTitles.sign_up', public: true } }
];

export default iamRoutes;
