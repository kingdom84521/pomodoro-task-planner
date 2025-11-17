<template>
  <div class="custom-fields-page">
    <div class="header">
      <h1 class="title">Custom Fields</h1>
      <p class="subtitle">Manage custom fields for your tasks</p>
    </div>

    <div class="content-grid">
      <!-- Predefined Fields Section -->
      <div class="section">
        <div class="section-header">
          <h2>Predefined Fields</h2>
          <p class="text-sm text-gray-500">Standard fields you can enable for your tasks</p>
        </div>

        <div class="field-list">
          <div
            v-for="field in predefinedFields"
            :key="field.name"
            class="field-card predefined"
          >
            <div class="field-info">
              <div class="field-name">
                <span class="icon">{{ field.icon }}</span>
                {{ field.name }}
              </div>
              <div class="field-meta">
                <span class="badge">{{ field.dataType }}</span>
                <span v-if="field.options" class="options-count">
                  {{ field.options.length }} options
                </span>
              </div>
            </div>
            <div class="field-actions">
              <label class="toggle">
                <input
                  type="checkbox"
                  :checked="field.enabled"
                  @change="togglePredefinedField(field.name)"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Fields Section -->
      <div class="section">
        <div class="section-header">
          <h2>Your Custom Fields</h2>
          <button @click="showCreateForm = !showCreateForm" class="btn-primary">
            {{ showCreateForm ? 'Cancel' : '+ Create Field' }}
          </button>
        </div>

        <!-- Create Form -->
        <div v-if="showCreateForm" class="create-form">
          <div class="form-group">
            <label>Field Name</label>
            <input
              v-model="newField.name"
              type="text"
              placeholder="e.g., Sprint Number"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label>Data Type</label>
            <select v-model="newField.dataType" class="form-select">
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="selection">Selection/Dropdown</option>
              <option value="boolean">Boolean/Checkbox</option>
              <option value="date">Date</option>
            </select>
          </div>

          <div v-if="newField.dataType === 'selection'" class="form-group">
            <label>Options (comma-separated)</label>
            <input
              v-model="newField.optionsInput"
              type="text"
              placeholder="e.g., Sprint 1, Sprint 2, Sprint 3"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="newField.required" type="checkbox" />
              Required field
            </label>
          </div>

          <button @click="createCustomField" class="btn-primary">
            Create Field
          </button>
        </div>

        <!-- Custom Fields List -->
        <div v-if="customFields.length === 0 && !showCreateForm" class="empty-state">
          <p>No custom fields yet</p>
          <p class="text-sm text-gray-500">Create your first custom field to get started</p>
        </div>

        <div v-else class="field-list">
          <div
            v-for="(field, index) in customFields"
            :key="index"
            class="field-card custom"
          >
            <div class="field-info">
              <div class="field-name">
                <span class="icon">🔧</span>
                {{ field.name }}
              </div>
              <div class="field-meta">
                <span class="badge">{{ field.dataType }}</span>
                <span v-if="field.required" class="badge badge-required">Required</span>
                <span v-if="field.options" class="options-count">
                  {{ field.options.length }} options
                </span>
              </div>
              <div v-if="field.options" class="field-options">
                <span v-for="opt in field.options" :key="opt" class="option-tag">
                  {{ opt }}
                </span>
              </div>
            </div>
            <div class="field-actions">
              <button @click="deleteCustomField(index)" class="btn-delete">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Info Section -->
    <div class="info-section">
      <h3>About Custom Fields</h3>
      <ul>
        <li><strong>Predefined Fields:</strong> Enable/disable standard fields like Priority, Tags, Client, etc.</li>
        <li><strong>Custom Fields:</strong> Create your own fields with different data types</li>
        <li><strong>Data Types:</strong> Text, Number, Selection (dropdown), Boolean (checkbox), Date</li>
        <li><strong>Usage:</strong> Custom fields will appear in task creation and editing forms</li>
        <li><strong>Note:</strong> Full backend integration coming soon (User Story 8)</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface PredefinedField {
  name: string;
  icon: string;
  dataType: string;
  enabled: boolean;
  options?: string[];
}

interface CustomField {
  name: string;
  dataType: string;
  required: boolean;
  options?: string[];
  optionsInput?: string;
}

// Predefined fields (7 standard fields from spec)
const predefinedFields = ref<PredefinedField[]>([
  {
    name: 'Priority',
    icon: '⚡',
    dataType: 'selection',
    enabled: true,
    options: ['Low', 'Medium', 'High', 'Urgent'],
  },
  {
    name: 'Tags',
    icon: '🏷️',
    dataType: 'text',
    enabled: true,
  },
  {
    name: 'Client',
    icon: '👤',
    dataType: 'text',
    enabled: false,
  },
  {
    name: 'Budget',
    icon: '💰',
    dataType: 'number',
    enabled: false,
  },
  {
    name: 'Status Label',
    icon: '📊',
    dataType: 'selection',
    enabled: true,
    options: ['To Do', 'In Progress', 'Review', 'Done'],
  },
  {
    name: 'Due Time',
    icon: '⏰',
    dataType: 'date',
    enabled: false,
  },
  {
    name: 'Notes',
    icon: '📝',
    dataType: 'text',
    enabled: false,
  },
]);

// Custom fields created by user
const customFields = ref<CustomField[]>([]);

// Create form state
const showCreateForm = ref(false);
const newField = ref<CustomField>({
  name: '',
  dataType: 'text',
  required: false,
  optionsInput: '',
});

const togglePredefinedField = (fieldName: string) => {
  const field = predefinedFields.value.find(f => f.name === fieldName);
  if (field) {
    field.enabled = !field.enabled;
    // TODO: Persist to backend when API is ready
    console.log(`Toggled ${fieldName}: ${field.enabled}`);
  }
};

const createCustomField = () => {
  if (!newField.value.name.trim()) {
    alert('Please enter a field name');
    return;
  }

  const field: CustomField = {
    name: newField.value.name,
    dataType: newField.value.dataType,
    required: newField.value.required,
  };

  // Parse options for selection type
  if (newField.value.dataType === 'selection' && newField.value.optionsInput) {
    field.options = newField.value.optionsInput
      .split(',')
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
  }

  customFields.value.push(field);

  // Reset form
  newField.value = {
    name: '',
    dataType: 'text',
    required: false,
    optionsInput: '',
  };
  showCreateForm.value = false;

  // TODO: Persist to backend when API is ready
  console.log('Created custom field:', field);
};

const deleteCustomField = (index: number) => {
  if (confirm('Are you sure you want to delete this custom field?')) {
    customFields.value.splice(index, 1);
    // TODO: Delete from backend when API is ready
  }
};
</script>

<style scoped>
.custom-fields-page {
  min-height: 100vh;
  background: #f9fafb;
  padding: 2rem;
}

.header {
  max-width: 1200px;
  margin: 0 auto 2rem;
}

.title {
  font-size: 2rem;
  font-weight: bold;
  color: #111827;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #6b7280;
  font-size: 1rem;
}

.content-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

@media (max-width: 968px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

.section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.field-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.field-card.predefined {
  background: #f9fafb;
}

.field-card.custom {
  background: white;
  border-left: 3px solid #6366f1;
}

.field-info {
  flex: 1;
}

.field-name {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon {
  font-size: 1.25rem;
}

.field-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.badge {
  padding: 0.25rem 0.5rem;
  background: #e0e7ff;
  color: #4f46e5;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.badge-required {
  background: #fef3c7;
  color: #d97706;
}

.options-count {
  font-size: 0.75rem;
  color: #6b7280;
}

.field-options {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.option-tag {
  padding: 0.25rem 0.5rem;
  background: #f3f4f6;
  color: #374151;
  border-radius: 4px;
  font-size: 0.75rem;
}

.field-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle input:checked + .toggle-slider {
  background-color: #6366f1;
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #4f46e5;
}

.btn-delete {
  padding: 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.btn-delete:hover {
  opacity: 1;
}

.create-form {
  padding: 1.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #6366f1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: auto;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.info-section {
  max-width: 1200px;
  margin: 2rem auto 0;
  padding: 1.5rem;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 12px;
}

.info-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 1rem;
}

.info-section ul {
  list-style: none;
  padding: 0;
}

.info-section li {
  padding: 0.5rem 0;
  color: #1e3a8a;
  font-size: 0.875rem;
}

.info-section strong {
  font-weight: 600;
}
</style>
