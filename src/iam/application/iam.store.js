import {authErrorKey} from '../domain/auth-error.js';
import {defineStore} from 'pinia';
import {computed, ref} from 'vue';
import {IamApi} from '../infrastructure/iam-api.js';
import {clearSession, readSession, saveSession} from '../infrastructure/session.js';

export const useIamStore = defineStore('iam', () => {
    const initial = readSession();
    const session = ref(initial);
    const error = ref('');
    const signingIn = ref(false);
    const currentRole = ref(initial?.activeRole || initial?.user?.role || '');
    const isSignedIn = computed(() => Boolean(session.value?.token && session.value.expiresAt > Date.now()));
    const currentToken = computed(() => session.value?.token || '');
    const currentUserId = computed(() => session.value?.user?.id ?? null);
    const currentUsername = computed(() => session.value?.user?.fullName || '');
    const companyId = computed(() => session.value?.user?.companyId || '');
    const allowedRoles = computed(() => session.value?.user?.allowedRoles || []);
    const testUsers = computed(() => allowedRoles.value.map(role => ({
        userId: currentUserId.value, name: currentUsername.value, role, label: `roles.${role}`
    })));

    function setRole(role) {
        if (!allowedRoles.value.includes(role)) return false;
        currentRole.value = role;
        session.value.activeRole = role;
        saveSession(session.value);
        return true;
    }

    function updateCurrentUser(user) {
        if (!session.value) return;
        session.value = {...session.value, user: {...session.value.user, ...user}};
        saveSession(session.value);
    }

    function signOut(router) {
        clearSession();
        session.value = null;
        currentRole.value = '';
        if (router) return router.replace({name: 'iam-sign-in'}).then(() => window.location.reload());
    }

    async function signIn(command, router) {
        signingIn.value = true;
        error.value = '';
        try {
            const api = new IamApi();
            const response = await api.signIn(command);
            const pending = {token: response.data.accessToken, expiresAt: Date.now() + response.data.expiresIn * 1000};
            saveSession(pending);
            const user = (await api.getCurrentUser()).data;
            session.value = {...pending, user, activeRole: user.role};
            currentRole.value = user.role;
            saveSession(session.value);
            if (router) await router.push('/inicio');
            return user;
        } catch (failure) {
            signOut();
            error.value = authErrorKey(failure);
            return null;
        } finally {
            signingIn.value = false;
        }
    }

    async function signUp(command, router) {
        signingIn.value = true;
        error.value = '';
        try {
            await new IamApi().signUp(command);
            return await signIn(command, router);
        } catch (failure) {
            error.value = authErrorKey(failure);
            return null;
        } finally {
            signingIn.value = false;
        }
    }

    return {currentRole, companyId, currentUsername, currentUserId, currentToken, isSignedIn,
        allowedRoles, testUsers, error, signingIn, setRole, signIn, signUp, signOut, updateCurrentUser};
});

export default useIamStore;
