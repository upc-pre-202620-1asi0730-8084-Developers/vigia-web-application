<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Sidebar from './sidebar.vue';
import LanguageSwitcher from './language-switcher.vue';
import FooterContent from './footer-content.vue';
import { navigationItems } from '../navigation.config.js';
import { formatCurrentDate } from '../formatters.js';
import useIamStore from '../../../iam/application/iam.store.js';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const iamStore = useIamStore();

const isUserMenuOpen = ref(false);
const formattedDate = computed(() => formatCurrentDate(locale.value));

const currentNav = computed(() => {
  return navigationItems.find(item => route.path.startsWith(item.path)) || { key: 'home', labelKey: 'nav.home', icon: 'pi pi-home' };
});

const userInitials = computed(() => {
  if (!iamStore.currentUsername) return 'VP';
  return iamStore.currentUsername
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
});

const currentRoleDisplay = computed(() => {
  return iamStore.currentRole ? t(`roles.${iamStore.currentRole}`) : '';
});

function toggleUserMenu() {
  isUserMenuOpen.value = !isUserMenuOpen.value;
}

function selectRole(newRole) {
  if (!iamStore.setRole(newRole)) return;
  isUserMenuOpen.value = false;

  const allowedRoles = route.meta?.roles;
  if (Array.isArray(allowedRoles) && !allowedRoles.includes(newRole)) {
    const firstAllowed = navigationItems.find(item => item.roles.includes(newRole));
    router.replace(firstAllowed?.path ?? '/inicio');
  }
}

function goToSettings() {
  isUserMenuOpen.value = false;
  router.push('/configuracion');
}

function handleOutsideClick(event) {
  const container = document.getElementById('user-profile-menu-container');
  if (container && !container.contains(event.target)) {
    isUserMenuOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<template>
  <div class="vigia-app-layout">
    <pv-toast position="top-right" />
    <pv-confirm-dialog />

    <!-- Barra de navegación global (Desktop Sidebar + Mobile Bottom Bar) -->
    <Sidebar />

    <!-- Área de contenido principal -->
    <div class="vigia-main-area">
      <!-- Topbar estilo Mockups Figma (§4.4.3): Fecha y Perfil de Usuario -->
      <header class="vigia-topbar">
        <div class="topbar-start">
          <nav class="vigia-breadcrumb" aria-label="Migas de pan">
            <router-link to="/inicio" class="breadcrumb-link">
              <i class="pi pi-home mr-1" aria-hidden="true"></i>
              <span>{{ t('nav.home') }}</span>
            </router-link>
            <span v-if="currentNav.key !== 'home'" class="breadcrumb-divider">/</span>
            <span v-if="currentNav.key !== 'home'" class="breadcrumb-current">
              <i :class="currentNav.icon" class="mr-1" aria-hidden="true"></i>
              {{ t(currentNav.labelKey) }}
            </span>
          </nav>
        </div>

        <div class="topbar-end">
          <!-- Indicador de Fecha (§4.4.3 Mockups Figma) -->
          <div class="topbar-date-pill">
            <i class="pi pi-calendar mr-2 text-secondary"></i>
            <span>{{ formattedDate }}</span>
          </div>

          <!-- Selector de Idioma -->
          <LanguageSwitcher />

          <!-- Cápsula de Perfil de Usuario / Selector de Rol Interactivo (§4.4.3) -->
          <div id="user-profile-menu-container" class="user-capsule-wrapper">
            <button
              type="button"
              class="user-capsule-btn"
              @click.stop="toggleUserMenu"
              aria-haspopup="true"
              :aria-expanded="isUserMenuOpen"
            >
              <div class="user-avatar-circle">
                {{ userInitials }}
              </div>
              <div class="user-details-text">
                <span class="user-name-text">{{ iamStore.currentUsername }}</span>
                <span class="user-role-text">{{ currentRoleDisplay }}</span>
              </div>
              <i class="pi pi-chevron-down text-xs text-secondary ml-1"></i>
            </button>

            <!-- Menú Desplegable de Cambio de Rol de Demostración -->
            <transition name="dropdown-fade">
              <div v-if="isUserMenuOpen" class="user-dropdown-card" @click.stop>
                <div class="dropdown-header">
                  <span class="dropdown-header-label">{{ t('nav.roleSelector') }}</span>
                  <span class="dropdown-user-name">{{ iamStore.currentUsername }}</span>
                </div>

                <div class="dropdown-roles-list">
                  <button
                    v-for="user in iamStore.testUsers"
                    :key="user.role"
                    type="button"
                    class="role-option-row"
                    :class="{ 'role-option-active': iamStore.currentRole === user.role }"
                    @click="selectRole(user.role)"
                  >
                    <div class="role-avatar-tiny">
                      {{ user.name.split(' ').map(n => n[0]).join('') }}
                    </div>
                    <div class="role-option-info">
                      <span class="role-person-name">{{ user.name }}</span>
                      <span class="role-badge-sub">{{ t(user.label) }}</span>
                    </div>
                    <i v-if="iamStore.currentRole === user.role" class="pi pi-check text-green ml-auto"></i>
                  </button>
                </div>

                <div class="dropdown-footer">
                  <button type="button" class="dropdown-footer-link" @click="iamStore.signOut(router)">{{ t('nav.signOut') }}</button>
                  <button type="button" class="dropdown-footer-link" @click="goToSettings">
                    <i class="pi pi-cog mr-2"></i>
                    <span>{{ t('nav.settings') }}</span>
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </header>

      <!-- Vista activa -->
      <main class="vigia-content-container">
        <router-view />
      </main>

      <!-- Pie de página compartido de la aplicación Vigía -->
      <FooterContent />
    </div>
  </div>
</template>

<style scoped>
.vigia-app-layout {
  display: flex;
  min-height: 100vh;
  background-color: #F8FAFC; /* Fondo sutil y limpio de Figma */
}

.vigia-main-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  min-height: 100vh;
}

@media (min-width: 961px) {
  .vigia-main-area {
    margin-left: 256px;
    width: calc(100% - 256px);
  }
}

@media (max-width: 960px) {
  .vigia-main-area {
    margin-left: 0;
    width: 100%;
    padding-bottom: 72px;
  }
}

/* =========================================================================
   TOPBAR - Exacto a los Mockups de Figma
   ========================================================================= */
.vigia-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
  padding: 0 28px;
  background-color: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  position: sticky;
  top: 0;
  z-index: 90;
}

.topbar-start {
  display: flex;
  align-items: center;
}

.vigia-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.breadcrumb-link {
  color: #64748B;
  text-decoration: none;
  font-weight: 500;
  display: flex;
  align-items: center;
  transition: color 150ms;
}

.breadcrumb-link:hover {
  color: #0F172A;
}

.breadcrumb-divider {
  color: #CBD5E1;
  font-size: 13px;
}

.breadcrumb-current {
  color: #0F172A;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.topbar-end {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Píldora de Fecha */
.topbar-date-pill {
  display: inline-flex;
  align-items: center;
  background-color: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

/* Cápsula de Usuario interactiva */
.user-capsule-wrapper {
  position: relative;
}

.user-capsule-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 24px;
  padding: 4px 10px 4px 4px;
  cursor: pointer;
  transition: all 180ms ease-in-out;
}

.user-capsule-btn:hover {
  background-color: #F1F5F9;
  border-color: #E2E8F0;
}

.user-avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #F1F5F9;
  border: 1px solid #CBD5E1;
  color: #0F172A;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-details-text {
  display: flex;
  flex-direction: column;
  text-align: left;
  line-height: 1.25;
}

.user-name-text {
  font-size: 13px;
  font-weight: 700;
  color: #0F172A;
}

.user-role-text {
  font-size: 11px;
  color: #64748B;
  font-weight: 500;
}

/* Menú flotante del perfil */
.user-dropdown-card {
  position: absolute;
  top: 48px;
  right: 0;
  width: 260px;
  background-color: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
  padding: 8px;
  z-index: 1000;
}

.dropdown-header {
  padding: 8px 10px 10px 10px;
  border-bottom: 1px solid #F1F5F9;
  display: flex;
  flex-direction: column;
}

.dropdown-header-label {
  font-size: 11px;
  font-weight: 500;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dropdown-user-name {
  font-size: 13px;
  font-weight: 700;
  color: #0F172A;
  margin-top: 2px;
}

.dropdown-roles-list {
  padding: 6px 0;
}

.role-option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background-color 150ms;
}

.role-option-row:hover {
  background-color: #F8FAFC;
}

.role-option-active {
  background-color: #FEF3C7 !important;
}

.role-avatar-tiny {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #E2E8F0;
  color: #0F172A;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-option-info {
  display: flex;
  flex-direction: column;
}

.role-person-name {
  font-size: 13px;
  font-weight: 600;
  color: #0F172A;
}

.role-badge-sub {
  font-size: 11px;
  color: #64748B;
}

.dropdown-footer {
  padding-top: 6px;
  border-top: 1px solid #F1F5F9;
}

.dropdown-footer-link {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
}

.dropdown-footer-link:hover {
  background-color: #F1F5F9;
  color: #0F172A;
}

/* Transición dropdown */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.vigia-content-container {
  flex: 1;
  padding: 24px 28px;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .vigia-topbar {
    padding: 0 16px;
    height: auto;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .topbar-date-pill {
    display: none;
  }

  .user-details-text {
    display: none;
  }

  .vigia-content-container {
    padding: 16px;
  }
}
</style>
