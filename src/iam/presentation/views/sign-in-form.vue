<script setup>
  import useIamStore from "../../application/iam.store.js";
  import {reactive} from "vue";
  import {useI18n} from "vue-i18n";
  import {SignInCommand} from "../../domain/sign-in.command.js";
  import {useRouter} from "vue-router";

  const {t} = useI18n();
  const router = useRouter();
  const store = useIamStore();
  const {signIn} = store;
  const form = reactive({
    username: '',
    password: ''
  })
  /**
   * Performs the sign-in action by creating a SignInCommand
   * with the provided username and password, and then calling
   * the signIn method from the store. Navigation is handled
   * automatically upon successful sign-in.
   */
  function performSignIn() {
    let signInCommand = new SignInCommand(form);
    signIn(signInCommand, router);
  }
</script>

<template>
  <div>
    <h3>{{ t('iam.signIn.title') }}</h3>
  </div>
  <p class="p-fluid mb-5">{{ t('iam.signIn.subtitle') }}</p>
  <div>
    <form @submit.prevent="performSignIn">
      <p v-if="store.error" role="alert" class="p-invalid">{{ store.error }}</p>
      <div class="p-fluid">
        <div class="field mt-5">
          <pv-float-label>
            <label for="username">{{ t('iam.usernameLabel') }}</label>
            <pv-input-text id="username" v-model="form.username" :class="{'p-invalid': !form.username}"/>
            <small v-if="!form.username" class="p-invalid">{{ t('iam.usernameRequired') }}</small>
          </pv-float-label>
        </div>
        <div class="p-field mt-5">
          <pv-float-label>
            <label for="password">{{ t('iam.passwordLabel') }}</label>
            <pv-input-text id="password" v-model="form.password" :class="{'p-invalid': !form.password}" type="password"/>
            <small v-if="!form.password" class="p-invalid">{{ t('iam.passwordRequired') }}</small>
          </pv-float-label>
        </div>
        <div class="p-field mt-5">
          <pv-button type="submit" :loading="store.signingIn">{{ t('nav.signIn') }}</pv-button>
          <router-link to="/iam/sign-up">{{ t('nav.signUp') }}</router-link>
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>

</style>
