/**
 * Task Priority Score Calculator
 *
 * 任務優先權計算演算法
 *
 * 設計理念：
 * 根據「資源配比」概念，每個任務分類有其時間配額限制。
 * 演算法會優先推薦「資源充裕」的分類任務，避免使用者過度集中於單一類型工作。
 *
 * 計算邏輯：
 * 1. 長期權重優先：半年期的資源剩餘有最高權重(1000)，短期波動容忍度較高
 * 2. 多時間區段加權：同時考慮 1天、3天、7天、15天、30天、90天、半年的使用情況
 * 3. 超標懲罰：若半年已超標，大幅降低該分類任務的優先權
 * 4. 原有優先順序：保留使用者手動設定的高/中/低優先順序加成
 *
 * 輸入資料結構：
 * - task: { category: string, priority?: '高'|'中'|'低' }
 * - resourceStats: {
 *     categoryLimits: {
 *       [category]: {
 *         limit: number,        // 該分類的配額百分比
 *         remaining6M: number,  // 半年剩餘配額
 *         warning: boolean      // 是否已超標
 *       }
 *     },
 *     periods: {
 *       [period]: {
 *         categories: {
 *           [category]: { percentage: number }  // 該時段已使用百分比
 *         }
 *       }
 *     }
 *   }
 *
 * 輸出：整數分數，越高越優先
 */

// 時間區段權重配置
// 設計原則：越長期的資源配比越重要，短期允許波動
const PERIOD_WEIGHTS = {
  "1D": 1,    // 單日：允許短期波動
  "3D": 2,    // 三天
  "7D": 4,    // 一週
  "15D": 8,   // 半月
  "30D": 16,  // 一月
  "90D": 32,  // 一季
  "6M": 1000, // 半年：權重極高，絕對遵守配額
};

/**
 * 計算任務的推薦權重分數（越高越優先）
 * @param {Object} task - 任務物件，需包含 category 和可選的 priority
 * @param {Object} resourceStats - 資源統計物件，包含 categoryLimits 和 periods
 * @returns {number} 權重分數（整數）
 */
function calculateTaskPriorityScore(task, resourceStats) {
  const category = task.category;

  // 沒有分類或分類不存在於配置中，返回最低分
  if (!category || !resourceStats.categoryLimits[category]) {
    return 0;
  }

  const categoryLimit = resourceStats.categoryLimits[category];
  let score = 0;

  // 1. 半年資源剩餘比例（最重要，權重 1000）
  // remaining6M 越大，代表該分類還有很多配額可用，應優先處理
  const halfYearRemaining = categoryLimit.remaining6M;
  score += halfYearRemaining * PERIOD_WEIGHTS["6M"];

  // 2. 各時間區段的剩餘資源（加權平均）
  // 遍歷所有時間區段，計算每個區段的剩餘配額並加權
  for (const [period, weight] of Object.entries(PERIOD_WEIGHTS)) {
    if (period === "6M") continue; // 半年已單獨處理

    const periodData = resourceStats.periods[period];
    if (periodData && periodData.categories[category]) {
      // 計算該時段的剩餘配額
      const usedInPeriod = periodData.categories[category].percentage;
      const remaining = categoryLimit.limit - usedInPeriod;
      score += remaining * weight;
    } else {
      // 該時間區段沒有使用記錄，視為完全未使用，給予滿分
      score += categoryLimit.limit * weight;
    }
  }

  // 3. 超標懲罰機制
  // 如果半年已超標，大幅降低分數（但不完全排除，仍可被選擇）
  if (categoryLimit.warning) {
    score -= 10000;
  }

  // 4. 使用者設定的優先順序加成
  // 保留手動調整的能力，高優先任務額外加分
  if (task.priority) {
    const priorityBonus = {
      "高": 100,
      "中": 50,
      "低": 0,
    };
    score += priorityBonus[task.priority] || 0;
  }

  return Math.round(score);
}

// ES Module 導出
export { PERIOD_WEIGHTS, calculateTaskPriorityScore };
