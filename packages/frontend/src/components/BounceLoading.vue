<template>
  <div class="bounce-loading">
    <div class="bounce-dot"></div>
    <div class="bounce-dot"></div>
    <div class="bounce-dot"></div>
  </div>
</template>

<style scoped>
.bounce-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 20px;
}

.bounce-dot {
  width: 10px;
  height: 10px;
  background-color: #909399;
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite both;
}

.bounce-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.bounce-dot:nth-child(2) {
  animation-delay: -0.16s;
}

.bounce-dot:nth-child(3) {
  animation-delay: 0s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
