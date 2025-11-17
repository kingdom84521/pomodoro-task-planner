<template>
  <div class="groups-page">
    <div class="header">
      <h1 class="title">Groups</h1>
      <p class="subtitle">Collaborate with your team on Pomodoro tasks</p>
    </div>

    <div class="content">
      <!-- Create Group Section -->
      <div class="section">
        <div class="section-header">
          <h2>Your Groups</h2>
          <button @click="showCreateForm = !showCreateForm" class="btn-primary">
            {{ showCreateForm ? 'Cancel' : '+ Create Group' }}
          </button>
        </div>

        <!-- Create Group Form -->
        <div v-if="showCreateForm" class="create-form">
          <div class="form-group">
            <label>Group Name</label>
            <input
              v-model="newGroup.name"
              type="text"
              placeholder="e.g., Development Team"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea
              v-model="newGroup.description"
              placeholder="What is this group for?"
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>

          <button @click="createGroup" class="btn-primary">
            Create Group
          </button>
        </div>

        <!-- Groups List -->
        <div v-if="groups.length === 0 && !showCreateForm" class="empty-state">
          <div class="empty-icon">👥</div>
          <p class="empty-title">No groups yet</p>
          <p class="empty-subtitle">Create your first group to start collaborating</p>
        </div>

        <div v-else class="groups-grid">
          <div
            v-for="(group, index) in groups"
            :key="index"
            class="group-card"
            :class="{ 'is-owner': group.isOwner }"
          >
            <div class="group-header">
              <div class="group-icon">{{ group.icon }}</div>
              <div class="group-info">
                <h3 class="group-name">{{ group.name }}</h3>
                <p class="group-description">{{ group.description }}</p>
              </div>
            </div>

            <div class="group-stats">
              <div class="stat">
                <span class="stat-icon">👤</span>
                <span class="stat-value">{{ group.memberCount }}</span>
                <span class="stat-label">Members</span>
              </div>
              <div class="stat">
                <span class="stat-icon">📋</span>
                <span class="stat-value">{{ group.taskCount }}</span>
                <span class="stat-label">Tasks</span>
              </div>
              <div class="stat">
                <span class="stat-icon">🍅</span>
                <span class="stat-value">{{ group.pomodoroCount }}</span>
                <span class="stat-label">Pomodoros</span>
              </div>
            </div>

            <div class="group-actions">
              <button @click="viewGroup(group)" class="btn-secondary">
                View Details
              </button>
              <button
                v-if="group.isOwner"
                @click="deleteGroup(index)"
                class="btn-danger"
              >
                Delete
              </button>
              <button v-else @click="leaveGroup(index)" class="btn-warning">
                Leave
              </button>
            </div>

            <div v-if="group.isOwner" class="owner-badge">Owner</div>
          </div>
        </div>
      </div>

      <!-- Join Group Section -->
      <div class="section">
        <div class="section-header">
          <h2>Join a Group</h2>
        </div>

        <div class="join-form">
          <p class="text-sm text-gray-600 mb-4">
            Enter an invitation code to join an existing group
          </p>
          <div class="join-input-group">
            <input
              v-model="inviteCode"
              type="text"
              placeholder="Enter invitation code"
              class="form-input"
            />
            <button @click="joinGroup" class="btn-primary">
              Join Group
            </button>
          </div>
        </div>
      </div>

      <!-- Features Info -->
      <div class="features-section">
        <h3>Group Features</h3>
        <div class="features-grid">
          <div class="feature">
            <div class="feature-icon">👥</div>
            <h4>Team Collaboration</h4>
            <p>Work together with your team on shared tasks</p>
          </div>
          <div class="feature">
            <div class="feature-icon">📊</div>
            <h4>Shared Analytics</h4>
            <p>View team productivity metrics and time distribution</p>
          </div>
          <div class="feature">
            <div class="feature-icon">✅</div>
            <h4>Task Assignment</h4>
            <p>Assign tasks to specific team members</p>
          </div>
          <div class="feature">
            <div class="feature-icon">🔧</div>
            <h4>Custom Fields</h4>
            <p>Define group-level custom fields for tasks</p>
          </div>
        </div>
      </div>

      <!-- Info Notice -->
      <div class="info-notice">
        <h4>🚧 Coming Soon</h4>
        <p>
          Full group collaboration features are coming in <strong>User Story 5</strong> (Phase 2).
          This preview shows the planned interface.
        </p>
        <p class="text-sm mt-2">
          Features include: team member management, task assignment, shared analytics,
          group-level custom fields, and real-time collaboration.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Group {
  name: string;
  description: string;
  icon: string;
  memberCount: number;
  taskCount: number;
  pomodoroCount: number;
  isOwner: boolean;
  inviteCode?: string;
}

// Sample groups for demonstration
const groups = ref<Group[]>([
  {
    name: 'Development Team',
    description: 'Frontend and backend developers working on core features',
    icon: '💻',
    memberCount: 5,
    taskCount: 12,
    pomodoroCount: 48,
    isOwner: true,
    inviteCode: 'DEV2024',
  },
  {
    name: 'Design Team',
    description: 'UI/UX designers and product designers',
    icon: '🎨',
    memberCount: 3,
    taskCount: 8,
    pomodoroCount: 32,
    isOwner: false,
  },
]);

const showCreateForm = ref(false);
const newGroup = ref({
  name: '',
  description: '',
});

const inviteCode = ref('');

const createGroup = () => {
  if (!newGroup.value.name.trim()) {
    alert('Please enter a group name');
    return;
  }

  const group: Group = {
    name: newGroup.value.name,
    description: newGroup.value.description || 'No description',
    icon: getRandomIcon(),
    memberCount: 1,
    taskCount: 0,
    pomodoroCount: 0,
    isOwner: true,
    inviteCode: generateInviteCode(),
  };

  groups.value.push(group);

  // Reset form
  newGroup.value = { name: '', description: '' };
  showCreateForm.value = false;

  // TODO: Persist to backend when API is ready
  console.log('Created group:', group);
  alert(`Group created! Invite code: ${group.inviteCode}`);
};

const joinGroup = () => {
  if (!inviteCode.value.trim()) {
    alert('Please enter an invitation code');
    return;
  }

  // TODO: Call backend API to join group
  console.log('Joining group with code:', inviteCode.value);
  alert('Group join functionality will be available in User Story 5');
  inviteCode.value = '';
};

const viewGroup = (group: Group) => {
  alert(`Viewing group: ${group.name}\n\nInvite Code: ${group.inviteCode || 'N/A'}\nMembers: ${group.memberCount}\nTasks: ${group.taskCount}`);
  // TODO: Navigate to group details page
};

const deleteGroup = (index: number) => {
  const group = groups.value[index];
  if (confirm(`Are you sure you want to delete "${group.name}"?`)) {
    groups.value.splice(index, 1);
    // TODO: Delete from backend when API is ready
  }
};

const leaveGroup = (index: number) => {
  const group = groups.value[index];
  if (confirm(`Are you sure you want to leave "${group.name}"?`)) {
    groups.value.splice(index, 1);
    // TODO: Leave group via backend when API is ready
  }
};

// Helper functions
const getRandomIcon = (): string => {
  const icons = ['👥', '💼', '🚀', '⚡', '🎯', '🔥', '💡', '🌟'];
  return icons[Math.floor(Math.random() * icons.length)];
};

const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
</script>

<style scoped>
.groups-page {
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

.content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
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

.btn-secondary {
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  padding: 0.5rem 1rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-warning {
  padding: 0.5rem 1rem;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-warning:hover {
  background: #d97706;
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
.form-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #6366f1;
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.group-card {
  position: relative;
  padding: 1.5rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;
}

.group-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.group-card.is-owner {
  border-color: #6366f1;
  background: linear-gradient(to bottom, #eef2ff, white);
}

.group-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.group-icon {
  font-size: 2.5rem;
}

.group-info {
  flex: 1;
}

.group-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}

.group-description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
}

.group-stats {
  display: flex;
  justify-content: space-around;
  padding: 1rem 0;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-icon {
  font-size: 1.25rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
}

.group-actions {
  display: flex;
  gap: 0.5rem;
}

.owner-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.25rem 0.75rem;
  background: #6366f1;
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.join-form {
  padding: 1.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.join-input-group {
  display: flex;
  gap: 0.5rem;
}

.join-input-group .form-input {
  flex: 1;
}

.features-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.features-section h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1.5rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.feature {
  text-align: center;
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.feature h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
}

.feature p {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
}

.info-notice {
  background: #fef3c7;
  border: 2px solid #fbbf24;
  border-radius: 12px;
  padding: 1.5rem;
}

.info-notice h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.75rem;
}

.info-notice p {
  color: #78350f;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.info-notice .text-sm {
  font-size: 0.875rem;
  color: #92400e;
}

.text-sm {
  font-size: 0.875rem;
}

.text-gray-600 {
  color: #6b7280;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mt-2 {
  margin-top: 0.5rem;
}
</style>
