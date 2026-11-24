<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { navigationItems } from '../navigation.config.js';
import useIamStore from '../../../iam/application/iam.store.js';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const iamStore = useIamStore();

const moreDialogVisible = ref(false);

// Filtrar ítems declarativos según el rol del usuario autenticado (§4.2.1, §4.2.5)
const allowedItems = computed(() => {
  return navigationItems.filter(item => item.roles.includes(iamStore.currentRole));
});

// Etiqueta del rol visible bajo el logo
const currentRoleDisplay = computed(() => {
  return iamStore.currentRole ? t(`roles.${iamStore.currentRole}`) : '';
});

// En mobile/tablet (<960px): máximo 4 accesos principales + "Más"
const mainMobileItems = computed(() => {
  if (allowedItems.value.length <= 5) {
    return allowedItems.value;
  }
  return allowedItems.value.slice(0, 4);
});

const moreMobileItems = computed(() => {
  if (allowedItems.value.length <= 5) {
    return [];
  }
  return allowedItems.value.slice(4);
});

const navigateFromMore = (path) => {
  moreDialogVisible.value = false;
  router.push(path);
};
</script>

<template>
  <!-- Barra lateral Desktop (>960px, §4.2.5) con la identidad de los mockups de Figma -->
  <aside class="vigia-sidebar-desktop" :aria-label="t('a11y.primaryNav')">
    <!-- Header de Marca: Logo Vigia con acento amarillo y subtítulo BUILDS WITH VISION -->
    <div class="sidebar-header">
      <div class="brand-container">
        <div class="brand-title-row">
          <span class="brand-title">{{ t('brand.name') }}</span>
          <span class="brand-accent-line"></span>
        </div>
        <span class="brand-tagline">{{ t('brand.menuTagline') }}</span>
      </div>
      <div class="role-badge-row">
        <span class="role-badge-text">{{ currentRoleDisplay }}</span>
      </div>
    </div>

    <!-- Lista de navegación con píldora amarilla sólida para el item activo -->
    <nav class="sidebar-nav" :aria-label="t('a11y.modules')">
      <ul class="nav-list">
        <li v-for="item in allowedItems" :key="item.key" class="nav-item-wrapper">
          <router-link
            :to="item.path"
            class="nav-link"
            active-class="nav-link-active"
            :aria-current="route.path.startsWith(item.path) ? 'page' : undefined"
          >
            <i :class="item.icon" class="nav-icon" aria-hidden="true"></i>
            <span class="nav-label">{{ t(item.labelKey) }}</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <!-- Footer de barra lateral: Slogan oficial de Vigia (§4.4.3 Mockups) -->
    <div class="sidebar-footer">
      <div class="sidebar-slogan">
        <p class="slogan-line font-medium m-0">{{ t('brand.sloganLine1') }}</p>
        <p class="slogan-line font-medium m-0 mb-2">{{ t('brand.sloganLine2') }}</p>
        <p class="slogan-sub m-0">{{ t('brand.sloganFooter') }}</p>
      </div>
    </div>
  </aside>

  <!-- Barra inferior Mobile y Tablet (<960px, §4.2.5) -->
  <nav class="vigia-bottom-bar" :aria-label="t('a11y.mobileNav')">
    <div class="bottom-bar-inner">
      <router-link
        v-for="item in mainMobileItems"
        :key="item.key"
        :to="item.path"
        class="bottom-nav-item"
        active-class="bottom-nav-item-active"
        :aria-current="route.path.startsWith(item.path) ? 'page' : undefined"
      >
        <i :class="item.icon" class="bottom-icon" aria-hidden="true"></i>
        <span class="bottom-label">{{ t(item.labelKey) }}</span>
      </router-link>

      <!-- Botón "Más" si hay elementos excedentes -->
      <button
        v-if="moreMobileItems.length > 0"
        type="button"
        class="bottom-nav-item more-button"
        @click="moreDialogVisible = true"
        aria-haspopup="dialog"
        :aria-expanded="moreDialogVisible"
      >
        <i class="pi pi-ellipsis-h bottom-icon" aria-hidden="true"></i>
        <span class="bottom-label">{{ t('nav.more') }}</span>
      </button>
    </div>
  </nav>

  <!-- Dialog inferior para opciones restantes en Mobile/Tablet (§3.4) -->
  <pv-dialog
    v-model:visible="moreDialogVisible"
    position="bottom"
    :modal="true"
    :header="t('nav.more')"
    class="vigia-more-dialog"
    :style="{ width: '100%', maxWidth: '480px', margin: '0 auto' }"
  >
    <ul class="more-options-list">
      <li v-for="item in moreMobileItems" :key="item.key">
        <button
          type="button"
          class="more-option-btn"
          @click="navigateFromMore(item.path)"
        >
          <i :class="item.icon" class="more-option-icon" aria-hidden="true"></i>
          <span class="more-option-label">{{ t(item.labelKey) }}</span>
          <i class="pi pi-chevron-right more-option-arrow" aria-hidden="true"></i>
        </button>
      </li>
    </ul>
  </pv-dialog>
</template>

<style scoped>
/* =========================================================================
   SIDEBAR DESKTOP (>960px) - Fiel a los Mockups de Figma
   ========================================================================= */
.vigia-sidebar-desktop {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 256px;
  background-color: #0B192C; /* Deep navy slate del mockup */
  color: #FFFFFF;
  display: flex;
  flex-direction: column;
  z-index: 100;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-header {
  padding: 24px 20px 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-container {
  display: flex;
  flex-direction: column;
}

.brand-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-title {
  font-size: 28px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: -0.5px;
  line-height: 1;
}

.brand-accent-line {
  display: inline-block;
  width: 28px;
  height: 4px;
  background-color: #FFB800; /* Acento dorado característico */
  border-radius: 2px;
  margin-top: 10px;
}

.brand-tagline {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.6px;
  color: #94A3B8;
  margin-top: 6px;
  text-transform: uppercase;
}

.role-badge-row {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.role-badge-text {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.3px;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item-wrapper {
  margin: 3px 12px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 16px;
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  min-height: 44px;
  transition: all 180ms ease-in-out;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: #FFFFFF;
}

.nav-link:focus-visible {
  outline: 2px solid #FFB800;
  outline-offset: 2px;
}

/* Píldora Dorada Característica del Mockup Figma */
.nav-link-active {
  background-color: #FFB800 !important;
  color: #0F172A !important;
  font-weight: 700 !important;
  border-radius: 10px !important;
  box-shadow: 0 2px 8px rgba(255, 184, 0, 0.25);
}

.nav-link-active .nav-icon {
  color: #0F172A !important;
}

.nav-icon {
  font-size: 18px;
  width: 20px;
  text-align: center;
  transition: color 180ms;
}

.nav-label {
  flex: 1;
}

/* =========================================================================
   SIDEBAR FOOTER (Desktop) - Slogan Oficial de Vigia
   ========================================================================= */
.sidebar-footer {
  margin-top: auto;
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background-color: rgba(0, 0, 0, 0.15);
}

.sidebar-slogan {
  display: flex;
  flex-direction: column;
}

.slogan-line {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
}

.slogan-sub {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.35;
  margin-top: 6px;
}

/* =========================================================================
   BOTTOM BAR MOBILE & TABLET (<960px)
   ========================================================================= */
.vigia-bottom-bar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background-color: #0B192C;
  color: #FFFFFF;
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.bottom-bar-inner {
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
  justify-content: space-around;
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  min-height: 48px;
  min-width: 48px;
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 2px;
  transition: all 180ms ease-in-out;
}

.bottom-nav-item:hover,
.bottom-nav-item:focus {
  color: #FFFFFF;
}

.bottom-nav-item-active {
  color: #FFB800 !important;
  font-weight: 700;
}

.bottom-icon {
  font-size: 18px;
  margin-bottom: 2px;
}

.bottom-label {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 68px;
}

/* Responsive toggle */
@media (max-width: 960px) {
  .vigia-sidebar-desktop {
    display: none;
  }
  .vigia-bottom-bar {
    display: flex;
  }
}

@media (min-width: 961px) {
  .vigia-sidebar-desktop {
    display: flex;
  }
  .vigia-bottom-bar {
    display: none;
  }
}
</style>
