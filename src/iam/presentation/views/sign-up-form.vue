<script setup>
import useIamStore from "../../application/iam.store.js";
import {reactive} from "vue";
import {useI18n} from "vue-i18n";
import {SignUpCommand} from "../../domain/sign-up.command.js";
import {useRouter} from "vue-router";

const {t} = useI18n();
const router = useRouter();
const store = useIamStore();
store.error = '';
const {signUp} = store;
const form = reactive({
  username: '',
  password: ''
})
/**
 * Performs the sign-up action by creating a SignUpCommand
 * with the provided username and password and then calling
 * the signUp method from the store.
 */
function performSignUp() {
  if (store.signingIn || !form.username.trim() || !form.password) return;
  let signUpCommand = new SignUpCommand(form);
  signUp(signUpCommand, router);
}
</script>

<template>
  <div>
    <h1>{{ t('iam.signUp.title') }}</h1>
  </div>
  <p class="p-fluid mb-5">{{ t('iam.signUp.subtitle') }}</p>
  <div>
    <form :aria-busy="store.signingIn" @submit.prevent="performSignUp">
      <p v-if="store.error" role="alert" class="p-invalid">{{ t(store.error) }}</p>
      <div class="p-fluid">
        <div class="field mt-5">
          <pv-float-label>
            <label for="username">{{ t('iam.usernameLabel') }}</label>
            <pv-input-text id="username" v-model="form.username" required autocomplete="username" :aria-invalid="!form.username" :aria-describedby="!form.username ? 'username-required' : undefined" :class="{'p-invalid': !form.username}"/>
            <small id="username-required" v-if="!form.username" class="p-invalid">{{ t('iam.usernameRequired') }}</small>
          </pv-float-label>
        </div>
        <div class="p-field mt-5">
          <pv-float-label>
            <label for="password">{{ t('iam.passwordLabel') }}</label>
            <pv-input-text id="password" v-model="form.password" required :aria-invalid="!form.password" :aria-describedby="!form.password ? 'password-required' : undefined" autocomplete="new-password" :class="{'p-invalid': !form.password}" type="password"/>
            <small id="password-required" v-if="!form.password" class="p-invalid">{{ t('iam.passwordRequired') }}</small>
          </pv-float-label>
        </div>
        <div class="p-field mt-5">
          <pv-button type="submit" :loading="store.signingIn" :disabled="store.signingIn">{{ t('nav.signUp') }}</pv-button>
          <router-link to="/iam/sign-in">{{ t('nav.signIn') }}</router-link>
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>

</style>
