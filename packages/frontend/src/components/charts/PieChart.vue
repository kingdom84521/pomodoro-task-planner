<template>
  <div ref="containerRef" class="pie-chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  title: {
    type: String,
    default: '',
  },
})

const canvasRef = ref(null)
const containerRef = ref(null)
let chartInstance = null

// Handle resize
useResizeObserver(containerRef, (entries) => {
  const entry = entries[0]
  console.log('[PieChart] ResizeObserver triggered:', {
    width: entry?.contentRect?.width,
    height: entry?.contentRect?.height,
    hasChart: !!chartInstance,
  })
  if (chartInstance) {
    chartInstance.resize()
  }
})

// Generate colors for pie chart
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

// Create or update chart
function updateChart() {
  if (!canvasRef.value) return

  const labels = props.data.map((item) => item.name)
  const values = props.data.map((item) => item.duration || item.percentage || 0)
  const colors = generateColors(props.data.length)

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            size: 12,
          },
          padding: 15,
          generateLabels: (chart) => {
            const data = chart.data
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i]
                const total = data.datasets[0].data.reduce((a, b) => a + b, 0)
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                return {
                  text: `${label}: ${percentage}%`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i,
                }
              })
            }
            return []
          },
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
          label: (context) => {
            const label = context.label || ''
            const value = context.parsed || 0
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0

            // If value is in seconds (duration), convert to hours
            if (props.data[context.dataIndex]?.duration) {
              const hours = (value / 3600).toFixed(1)
              return `${label}: ${hours}h (${percentage}%)`
            }

            return `${label}: ${percentage}%`
          },
        },
      },
    },
  }

  if (chartInstance) {
    chartInstance.data = chartData
    chartInstance.options = options
    chartInstance.update('none') // No animation on update
  } else {
    chartInstance = new Chart(canvasRef.value, {
      type: 'pie',
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
  () => props.title,
  () => {
    updateChart()
  }
)

onMounted(async () => {
  console.log('[PieChart] onMounted - before nextTick')
  await nextTick()
  console.log('[PieChart] onMounted - after nextTick, container size:', {
    width: containerRef.value?.offsetWidth,
    height: containerRef.value?.offsetHeight,
  })
  updateChart()

  // Force resize after a short delay to handle layout shifts
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      console.log('[PieChart] Double RAF resize, container size:', {
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
.pie-chart-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

canvas {
  max-width: 100%;
  max-height: 100%;
}
</style>
