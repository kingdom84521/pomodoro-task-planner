<template>
  <div ref="containerRef" class="line-chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
  // Data points: [{ date, percentages: [{ resourceId, name, percentage }] }]
  data: {
    type: Array,
    default: () => [],
  },
  // Target line value (e.g., percentage_limit)
  targetLine: {
    type: Number,
    default: null,
  },
  // Index of highlighted point
  highlightedIndex: {
    type: Number,
    default: null,
  },
  // Chart title
  title: {
    type: String,
    default: '',
  },
  // Use animation on window change
  useAnimation: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['point-click'])

const canvasRef = ref(null)
const containerRef = ref(null)
let chartInstance = null

// Handle resize
useResizeObserver(containerRef, (entries) => {
  const entry = entries[0]
  console.log('[LineChart] ResizeObserver triggered:', {
    width: entry?.contentRect?.width,
    height: entry?.contentRect?.height,
    hasChart: !!chartInstance,
  })
  if (chartInstance) {
    chartInstance.resize()
  }
})

// Generate colors for different resources
function generateColors(count) {
  const baseColors = [
    '#409EFF', // Element Plus primary
    '#67C23A', // green
    '#E6A23C', // orange
    '#F56C6C', // red
    '#909399', // gray
    '#00A0E9', // cyan
    '#B37FEB', // purple
    '#52C41A', // lime green
  ]

  const colors = []
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length])
  }
  return colors
}

// Prepare datasets from data
const datasets = computed(() => {
  if (!props.data || props.data.length === 0) return []

  // Collect all unique resources
  const resourceMap = new Map()
  for (const point of props.data) {
    if (point.percentages) {
      for (const item of point.percentages) {
        if (!resourceMap.has(item.resourceId)) {
          resourceMap.set(item.resourceId, item.name)
        }
      }
    }
  }

  const resources = Array.from(resourceMap.entries())
  const colors = generateColors(resources.length)

  // Build datasets for each resource
  const datasets = resources.map(([resourceId, name], index) => {
    const data = props.data.map((point) => {
      const item = point.percentages?.find((p) => p.resourceId === resourceId)
      return item ? item.percentage : 0
    })

    return {
      label: name,
      data,
      borderColor: colors[index],
      backgroundColor: colors[index] + '20', // 20% opacity
      borderWidth: 2,
      tension: 0.3, // Smooth curves
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: false,
    }
  })

  // Add target line if provided
  if (props.targetLine !== null) {
    datasets.push({
      label: '目標線',
      data: new Array(props.data.length).fill(props.targetLine),
      borderColor: '#F56C6C',
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [5, 5], // Dashed line
      pointRadius: 0, // No points
      pointHoverRadius: 0,
      fill: false,
    })
  }

  return datasets
})

// Update chart
function updateChart() {
  if (!canvasRef.value || !props.data || props.data.length === 0) return

  const labels = props.data.map((point) => point.date)

  const chartData = {
    labels,
    datasets: datasets.value,
  }

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 12,
          },
          padding: 10,
          usePointStyle: true,
        },
      },
      title: {
        display: !!props.title,
        text: props.title,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            return context[0].label
          },
          label: (context) => {
            const label = context.dataset.label || ''
            const value = context.parsed.y.toFixed(1)
            return `${label}: ${value}%`
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 20,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '百分比 (%)',
        },
        beginAtZero: true,
        max: 100,
      },
    },
    onClick: (event, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index
        emit('point-click', index)
      }
    },
    animation: props.useAnimation
      ? {
          duration: 750,
        }
      : false,
  }

  // Apply highlight effect
  if (props.highlightedIndex !== null && datasets.value.length > 0) {
    chartData.datasets.forEach((dataset) => {
      if (!dataset.label.includes('目標線')) {
        // Create arrays for point sizes
        const pointRadii = new Array(props.data.length).fill(4)
        const pointHoverRadii = new Array(props.data.length).fill(6)

        // Highlight the selected point
        pointRadii[props.highlightedIndex] = 8
        pointHoverRadii[props.highlightedIndex] = 10

        dataset.pointRadius = pointRadii
        dataset.pointHoverRadius = pointHoverRadii
      }
    })
  }

  if (chartInstance) {
    chartInstance.data = chartData
    chartInstance.options = options
    chartInstance.update(props.useAnimation ? 'default' : 'none')
  } else {
    chartInstance = new Chart(canvasRef.value, {
      type: 'line',
      data: chartData,
      options,
    })
  }
}

// Watch for data changes
watch(
  () => props.data,
  () => {
    updateChart()
  },
  { deep: true }
)

watch(
  () => props.targetLine,
  () => {
    updateChart()
  }
)

watch(
  () => props.highlightedIndex,
  () => {
    updateChart()
  }
)

watch(
  () => props.title,
  () => {
    updateChart()
  }
)

onMounted(async () => {
  console.log('[LineChart] onMounted - before nextTick')
  await nextTick()
  console.log('[LineChart] onMounted - after nextTick, container size:', {
    width: containerRef.value?.offsetWidth,
    height: containerRef.value?.offsetHeight,
  })
  updateChart()

  // Force resize after a short delay to handle layout shifts
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      console.log('[LineChart] Double RAF resize, container size:', {
        width: containerRef.value?.offsetWidth,
        height: containerRef.value?.offsetHeight,
      })
      if (chartInstance) {
        chartInstance.resize()
      }
    })
  })
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})
</script>

<style scoped>
.line-chart-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

canvas {
  max-width: 100%;
  max-height: 100%;
}
</style>
