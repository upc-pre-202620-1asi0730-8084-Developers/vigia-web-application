<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// Las páginas legales se publican junto con el Landing Page
const websiteUrl = "https://upc-pre-202620-1asi0730-8084-developers.github.io/vigia-website";
</script>

<template>
  <footer class="vigia-footer">
    <div class="footer-container">
      <p class="m-0 text-sm font-medium">Copyright &copy; 2026. Vigía &bull; Trazza Labs</p>
      <p class="m-0 text-xs text-secondary">
        {{ t('brand.tagline') }}
      </p>
      <nav class="footer-links text-xs" :aria-label="t('footer.legalLabel')">
        <a :href="`${websiteUrl}/terminos-y-condiciones.html`" target="_blank" rel="noopener noreferrer">
          {{ t('footer.terms') }}
        </a>
        <a :href="`${websiteUrl}/politica-de-privacidad.html`" target="_blank" rel="noopener noreferrer">
          {{ t('footer.privacy') }}
        </a>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.vigia-footer {
  width: 100%;
  padding: var(--sp-16) var(--sp-24);
  background-color: var(--color-surface);
  border-top: 1px solid #E0E0E0;
  margin-top: auto;
}

.footer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  text-align: center;
  color: var(--color-text-secondary);
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--sp-4) var(--sp-16);
}

.footer-links a {
  color: inherit;
  text-decoration: underline;
}

.footer-links a:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
</style>