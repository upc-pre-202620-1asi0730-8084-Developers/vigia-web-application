const signInForm = () => import('./views/sign-in-form.vue')
const signUpForm = () => import('./views/sign-up-form.vue')
const iamRoutes = [
    { path: '/iam/sign-in', name: 'iam-sign-in', component: signInForm, meta: { title: 'Sign-In', public: true } },
    { path: '/iam/sign-up', name: 'iam-sign-up', component: signUpForm, meta: { title: 'Sign-Up', public: true } }
];

export default iamRoutes;
