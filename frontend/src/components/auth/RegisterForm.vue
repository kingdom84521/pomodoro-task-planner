<template>
  <div class="register-form">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Create Account</h2>

      <AppInput
        v-model="formData.name"
        type="text"
        label="Name"
        placeholder="Enter your name"
        :error="errors.name"
        :disabled="isLoading"
        required
      />

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
        placeholder="Enter your password (min 8 characters)"
        :error="errors.password"
        :disabled="isLoading"
        required
      />

      <AppInput
        v-model="formData.confirmPassword"
        type="password"
        label="Confirm Password"
        placeholder="Confirm your password"
        :error="errors.confirmPassword"
        :disabled="isLoading"
        required
      />

      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">
          Timezone (Optional)
        </label>
        <select
          v-model="formData.timezone"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          :disabled="isLoading"
        >
          <option value="">Auto-detect</option>
          <option value="America/New_York">America/New York (EST)</option>
          <option value="America/Chicago">America/Chicago (CST)</option>
          <option value="America/Denver">America/Denver (MST)</option>
          <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
          <option value="Europe/London">Europe/London (GMT)</option>
          <option value="Europe/Paris">Europe/Paris (CET)</option>
          <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
          <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
          <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
        </select>
      </div>

      <div v-if="error" class="text-red-600 text-sm">
        {{ error }}
      </div>

      <AppButton
        type="submit"
        :loading="isLoading"
        :disabled="isLoading"
        full-width
      >
        Register
      </AppButton>

      <div class="text-center text-sm text-gray-600">
        Already have an account?
        <router-link to="/login" class="text-blue-600 hover:text-blue-700 font-medium">
          Login
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

const { register, isLoading, error } = useAuth();

const formData = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  timezone: '',
});

const errors = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const validateForm = (): boolean => {
  let isValid = true;
  errors.name = '';
  errors.email = '';
  errors.password = '';
  errors.confirmPassword = '';

  if (!formData.name || formData.name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
    isValid = false;
  }

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
  } else if (formData.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
    isValid = false;
  } else if (!/[A-Za-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
    errors.password = 'Password must contain both letters and numbers';
    isValid = false;
  }

  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
    isValid = false;
  }

  return isValid;
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  try {
    await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      timezone: formData.timezone || undefined,
    });
  } catch (err) {
    // Error is handled by the composable
    console.error('Registration failed:', err);
  }
};
</script>

<style scoped>
.register-form {
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
