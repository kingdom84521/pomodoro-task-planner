<template>
  <div class="login-form">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Login</h2>

      <AppInput
        v-model="formData.email"
        type="email"
        label="Email"
        placeholder="Enter your email"
        :error="errors.email"
        :disabled="isLoading"
        required
      />

      <AppInput
        v-model="formData.password"
        type="password"
        label="Password"
        placeholder="Enter your password"
        :error="errors.password"
        :disabled="isLoading"
        required
      />

      <div v-if="error" class="text-red-600 text-sm">
        {{ error }}
      </div>

      <AppButton
        type="submit"
        :loading="isLoading"
        :disabled="isLoading"
        full-width
      >
        Login
      </AppButton>

      <div class="text-center text-sm text-gray-600">
        Don't have an account?
        <router-link to="/register" class="text-blue-600 hover:text-blue-700 font-medium">
          Register
        </router-link>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useAuth } from '../../composables/useAuth';
import AppInput from '../common/AppInput.vue';
import AppButton from '../common/AppButton.vue';

const { login, isLoading, error } = useAuth();

const formData = reactive({
  email: '',
  password: '',
});

const errors = reactive({
  email: '',
  password: '',
});

const validateForm = (): boolean => {
  let isValid = true;
  errors.email = '';
  errors.password = '';

  if (!formData.email) {
    errors.email = 'Email is required';
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Invalid email format';
    isValid = false;
  }

  if (!formData.password) {
    errors.password = 'Password is required';
    isValid = false;
  }

  return isValid;
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  try {
    await login({
      email: formData.email,
      password: formData.password,
    });
  } catch (err) {
    // Error is handled by the composable
    console.error('Login failed:', err);
  }
};
</script>

<style scoped>
.login-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
