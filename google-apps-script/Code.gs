/**
 * Google Apps Script - 根據欄位定義自動產生格式化試算表
 *
 * 使用方式：
 * 1. 在 "欄位定義" 工作表中定義欄位（Title, Data Type）
 * 2. 執行 createFormattedSpreadsheet() 函數
 */

// 顏色配置
const COLORS = {
  HEADER_BG: "#4285F4", // Google 藍
  HEADER_TEXT: "#FFFFFF", // 白色文字
  STRING_BG: "#E8F0FE", // 淺藍
  NUMBER_BG: "#E6F4EA", // 淺綠
  DATE_BG: "#FEF7E0", // 淺黃
  BOOLEAN_BG: "#FCE8E6", // 淺紅
  DEFAULT_BG: "#F8F9FA", // 淺灰
  BORDER: "#DADCE0", // 邊框灰
};

// 資料類型對應的背景色
const TYPE_COLORS = {
  string: COLORS.STRING_BG,
  text: COLORS.STRING_BG,
  number: COLORS.NUMBER_BG,
  integer: COLORS.NUMBER_BG,
  float: COLORS.NUMBER_BG,
  date: COLORS.DATE_BG,
  datetime: COLORS.DATE_BG,
  boolean: COLORS.BOOLEAN_BG,
  bool: COLORS.BOOLEAN_BG,
  enum: "#F3E8FF", // 淺紫色
};

// 內建的 status enum 定義
const BUILTIN_ENUMS = {
  status: ["已完成", "進行中", "擱置中", "已交接", "已取消", "待處理"],
};

// 預設必要欄位（任務序號、任務名稱、任務分類、任務狀態）
const DEFAULT_FIELDS = [
  {
    title: "任務序號",
    dataType: "integer",
    description: "任務編號",
    enumName: "",
  },
  {
    title: "任務名稱",
    dataType: "string",
    description: "任務的標題或名稱",
    enumName: "",
  },
  {
    title: "任務分類",
    dataType: "enum",
    description: "任務的分類類型",
    enumName: "任務分類",
  },
  {
    title: "任務狀態",
    dataType: "enum",
    description: "任務目前狀態",
    enumName: "status",
  },
];

// 需要複製到新半年度的狀態
const CARRY_OVER_STATUSES = ["進行中", "擱置中", "待處理"];

/**
 * 調整顏色亮度
 * @param {string} hex - hex 色碼
 * @param {number} percent - 亮度調整百分比（正值變亮，負值變暗）
 * @returns {string} 調整後的 hex 色碼
 */
function adjustBrightness(hex, percent) {
  hex = hex.replace("#", "");

  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  r = Math.min(255, Math.max(0, r + (255 * percent) / 100));
  g = Math.min(255, Math.max(0, g + (255 * percent) / 100));
  b = Math.min(255, Math.max(0, b + (255 * percent) / 100));

  return (
    "#" +
    Math.round(r).toString(16).padStart(2, "0") +
    Math.round(g).toString(16).padStart(2, "0") +
    Math.round(b).toString(16).padStart(2, "0")
  );
}

/**
 * 根據基底顏色產生配色方案
 * @param {string} baseColor - 基底顏色 hex 碼
 * @returns {Object} 配色方案
 */
function generateColorScheme(baseColor) {
  return {
    headerBg: adjustBrightness(baseColor, -20), // 深色（標題列背景）
    headerText: "#FFFFFF", // 白色（標題列文字）
    dataBg: adjustBrightness(baseColor, 60), // 淺色（資料列背景）
    dataText: "#000000", // 黑色（資料列文字）
    border: adjustBrightness(baseColor, 30), // 中等深度（邊框）
  };
}

/**
 * 主函數：顯示建立試算表對話框
 */
function createFormattedSpreadsheet() {
  const ui = SpreadsheetApp.getUi();

  // 顯示整合的對話框（包含使用者名稱和顏色選擇）
  const html = HtmlService.createHtmlOutputFromFile("ColorPicker")
    .setWidth(350)
    .setHeight(500);
  ui.showModalDialog(html, "建立使用者試算表");
}

/**
 * 處理建立試算表（由 ColorPicker.html 呼叫）
 * @param {string} userName - 使用者名稱
 * @param {string} color - 選擇的顏色 hex 碼
 */
function processColorSelection(userName, color) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // 檢查使用者名稱
  if (!userName || userName.trim() === "") {
    throw new Error("使用者名稱不可為空");
  }

  // 讀取欄位定義
  const fieldDefinitions = readFieldDefinitions(ss);

  if (fieldDefinitions.length === 0) {
    throw new Error('找不到欄位定義，請確認 "欄位定義" 工作表存在且有資料。');
  }

  // 讀取 enum 定義
  const enumDefinitions = readEnumDefinitions(ss);

  // 產生配色方案
  const colorScheme = generateColorScheme(color);

  // 建立新的試算表
  const newSpreadsheet = createNewSpreadsheet(
    fieldDefinitions,
    userName,
    enumDefinitions,
    colorScheme
  );

  // 記錄試算表連結到清單
  const url = newSpreadsheet.getUrl();
  const spreadsheetId = newSpreadsheet.getId();
  saveSpreadsheetLink(
    ss,
    userName,
    newSpreadsheet.getName(),
    url,
    spreadsheetId
  );

  // 建立空的分類設定表（在主試算表中）
  const categoryConfigResult = createEmptyCategoryConfigSheet(ss, userName);
  let categoryConfigMessage = "";
  if (categoryConfigResult.success) {
    if (categoryConfigResult.alreadyExists) {
      categoryConfigMessage = `\n\n📋 分類設定表「${categoryConfigResult.sheetName}」已存在。`;
    } else {
      categoryConfigMessage = `\n\n📋 已建立分類設定表「${categoryConfigResult.sheetName}」。\n請在主試算表中填入分類資料。`;
    }
  } else {
    categoryConfigMessage = `\n\n⚠️ 分類設定表建立失敗：${categoryConfigResult.error}`;
  }

  // 顯示結果
  ui.alert(
    "成功建立試算表",
    `已為「${userName}」建立試算表。\n\n` +
      `欄位數: ${fieldDefinitions.length}\n` +
      `名稱: ${newSpreadsheet.getName()}\n` +
      `連結: ${url}` +
      categoryConfigMessage,
    ui.ButtonSet.OK
  );

  Logger.log(`新試算表已建立: ${url}`);
}

/**
 * 儲存試算表連結到「試算表清單」工作表
 * @param {SpreadsheetApp.Spreadsheet} ss - 主試算表物件
 * @param {string} userName - 使用者名稱
 * @param {string} spreadsheetName - 新試算表名稱
 * @param {string} url - 試算表連結
 * @param {string} spreadsheetId - 試算表 ID
 */
function saveSpreadsheetLink(
  ss,
  userName,
  spreadsheetName,
  url,
  spreadsheetId
) {
  const sheetName = "試算表清單";
  let sheet = ss.getSheetByName(sheetName);

  // 如果工作表不存在，建立它
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);

    // 設定標題
    const headers = ["使用者", "試算表名稱", "試算表 ID", "連結", "建立時間"];
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    formatHeaderRow(headerRange);

    // 設定欄寬
    sheet.setColumnWidth(1, 120);
    sheet.setColumnWidth(2, 250);
    sheet.setColumnWidth(3, 320);
    sheet.setColumnWidth(4, 350);
    sheet.setColumnWidth(5, 160);

    // 凍結標題列
    sheet.setFrozenRows(1);
  }

  // 新增一筆記錄
  const timestamp = Utilities.formatDate(
    new Date(),
    "Asia/Taipei",
    "yyyy-MM-dd HH:mm:ss"
  );
  const newRow = [userName, spreadsheetName, spreadsheetId, url, timestamp];

  // 在最後一列之後新增
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);

  // 格式化新增的列
  const newRowRange = sheet.getRange(lastRow + 1, 1, 1, newRow.length);
  newRowRange.setBorder(
    true,
    true,
    true,
    true,
    true,
    true,
    COLORS.BORDER,
    SpreadsheetApp.BorderStyle.SOLID
  );

  Logger.log(`已記錄試算表連結: ${userName} - ${spreadsheetName}`);
}

/**
 * 讀取欄位定義工作表
 * @param {SpreadsheetApp.Spreadsheet} ss - 試算表物件
 * @returns {Array} 欄位定義陣列（包含預設欄位 + 自訂欄位）
 */
function readFieldDefinitions(ss) {
  // 從預設必要欄位開始
  const fields = JSON.parse(JSON.stringify(DEFAULT_FIELDS));

  const sheet = ss.getSheetByName("欄位定義");

  if (!sheet) {
    Logger.log('找不到 "欄位定義" 工作表，使用預設欄位');
    return fields;
  }

  const data = sheet.getDataRange().getValues();

  // 跳過標題列，從第二列開始讀取自訂欄位
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const title = row[0]?.toString().trim();
    const dataType = row[1]?.toString().trim().toLowerCase();

    if (title) {
      const field = {
        title: title,
        dataType: dataType || "string",
        description: row[2]?.toString().trim() || "",
        enumName: row[3]?.toString().trim() || "", // 對應「Enum 定義」工作表的 enum 名稱
      };

      fields.push(field);
    }
  }

  Logger.log(`讀取到 ${fields.length} 個欄位定義（含預設欄位）`);
  return fields;
}

/**
 * 讀取「Enum 定義」工作表中的所有 enum 定義
 * @param {SpreadsheetApp.Spreadsheet} ss - 試算表物件
 * @returns {Object} enum 定義物件 {enumName: [value1, value2, ...]}
 */
function readEnumDefinitions(ss) {
  // 從內建 enum 開始
  const enums = JSON.parse(JSON.stringify(BUILTIN_ENUMS));

  // 動態加入使用者的任務分類選項
  try {
    const userName = getCurrentUserName(ss);
    const categoryOptions = getUserCategoryOptions(ss, userName);
    if (categoryOptions.length > 0) {
      enums["任務分類"] = categoryOptions;
      Logger.log(
        `為使用者 ${userName} 載入了 ${categoryOptions.length} 個分類選項`
      );
    }
  } catch (e) {
    Logger.log("載入任務分類選項時發生錯誤: " + e.message);
  }

  const sheet = ss.getSheetByName("Enum 定義");

  if (!sheet) {
    Logger.log('找不到 "Enum 定義" 工作表，使用內建 enum');
    return enums;
  }

  const values = sheet.getDataRange().getValues();
  const numCols = values[0].length;

  // 每一欄是一個 enum
  for (let col = 0; col < numCols; col++) {
    const enumName = values[0][col]?.toString().trim();
    if (!enumName) continue;

    const options = [];

    // 從第二列開始讀取選項
    for (let row = 1; row < values.length; row++) {
      const value = values[row][col]?.toString().trim();
      if (!value) continue;
      options.push(value);
    }

    if (options.length > 0) {
      // 自訂 enum 會覆蓋內建的同名 enum（但不覆蓋動態載入的任務分類）
      if (enumName !== "任務分類" || !enums["任務分類"]) {
        enums[enumName] = options;
      }
    }
  }

  Logger.log(`讀取到 ${Object.keys(enums).length} 個 enum 定義（含內建）`);
  return enums;
}

/**
 * 取得目前半年度名稱
 * @param {Date} date - 日期
 * @returns {string} 半年度名稱（如 "2025 H1"）
 */
function getHalfYearName(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed
  const half = month <= 6 ? "H1" : "H2";
  return `${year} ${half}`;
}

/**
 * 建立新的格式化試算表
 * @param {Array} fieldDefinitions - 欄位定義陣列
 * @param {string} userName - 使用者名稱
 * @param {Object} enumDefinitions - enum 定義物件
 * @param {Object} colorScheme - 配色方案
 * @returns {SpreadsheetApp.Spreadsheet} 新建立的試算表
 */
function createNewSpreadsheet(
  fieldDefinitions,
  userName,
  enumDefinitions,
  colorScheme
) {
  const now = new Date();
  const halfYearName = getHalfYearName(now);
  const newName = `${userName}_任務列表`;

  // 建立新試算表
  const newSS = SpreadsheetApp.create(newName);
  const sheet = newSS.getActiveSheet();
  sheet.setName(halfYearName);

  // 設定欄位標題
  const headers = fieldDefinitions.map((f) => f.title);
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);

  // 格式化標題列（使用自訂配色）
  formatHeaderRowWithColor(headerRange, colorScheme);

  // 設定各欄位格式（使用自訂配色）
  formatDataColumnsWithColor(sheet, fieldDefinitions, colorScheme);

  // 設定欄寬
  setColumnWidths(sheet, fieldDefinitions);

  // 凍結標題列
  sheet.setFrozenRows(1);

  // 新增資料驗證（如果適用）
  addDataValidation(sheet, fieldDefinitions, enumDefinitions);

  // 新增條件格式
  addConditionalFormatting(sheet, fieldDefinitions);

  // 設定任務序號公式
  addTaskIdFormulas(sheet, fieldDefinitions);

  // 儲存配色方案到試算表屬性（供之後建立新 sheet 時使用）
  const props = PropertiesService.getDocumentProperties();
  props.setProperty(
    "colorScheme_" + newSS.getId(),
    JSON.stringify(colorScheme)
  );

  // 儲存主試算表 URL 到使用者試算表的屬性（供讀取欄位定義用）
  const mainSS = SpreadsheetApp.getActiveSpreadsheet();
  const userProps = PropertiesService.getDocumentProperties();
  // 使用新試算表的 DocumentProperties
  const newSSProps = newSS.getId();

  // 透過 ScriptProperties 儲存對應關係（因為 DocumentProperties 需要在該試算表的 context 中）
  const scriptProps = PropertiesService.getScriptProperties();
  scriptProps.setProperty("mainSpreadsheetId", mainSS.getId());

  // 為新試算表安裝 onOpen 觸發器
  installTriggerForSpreadsheet(newSS);

  // 建立工時記錄表
  getOrCreateTimeSheet(newSS);

  return newSS;
}

/**
 * 為指定試算表安裝觸發器
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet - 要安裝觸發器的試算表
 */
function installTriggerForSpreadsheet(spreadsheet) {
  try {
    // 建立 onOpen 觸發器
    ScriptApp.newTrigger("onOpenUserSpreadsheet")
      .forSpreadsheet(spreadsheet)
      .onOpen()
      .create();

    // 建立 onChange 觸發器（用於偵測工作表切換）
    ScriptApp.newTrigger("onChangeUserSpreadsheet")
      .forSpreadsheet(spreadsheet)
      .onChange()
      .create();

    // 建立 onEdit 觸發器（用於偵測未保護工作表的編輯）
    ScriptApp.newTrigger("onEditUserSpreadsheet")
      .forSpreadsheet(spreadsheet)
      .onEdit()
      .create();

    Logger.log(`已為試算表 "${spreadsheet.getName()}" 安裝觸發器`);
  } catch (e) {
    Logger.log(`安裝觸發器失敗: ${e.message}`);
  }
}

/**
 * 手動為所有使用者試算表重新安裝觸發器
 */
function reinstallTriggersForAllUsers() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    // 讀取試算表清單
    const listSheet = ss.getSheetByName("試算表清單");
    if (!listSheet) {
      ui.alert("錯誤", "找不到「試算表清單」工作表", ui.ButtonSet.OK);
      return;
    }

    const data = listSheet.getDataRange().getValues();
    if (data.length < 2) {
      ui.alert("錯誤", "試算表清單中沒有使用者資料", ui.ButtonSet.OK);
      return;
    }

    // 找到欄位索引
    const headers = data[0];
    const userNameCol = headers.findIndex(h => h.toString().trim() === "使用者");
    const spreadsheetIdCol = headers.findIndex(h => h.toString().trim() === "試算表 ID");

    if (userNameCol === -1 || spreadsheetIdCol === -1) {
      ui.alert("錯誤", "試算表清單缺少必要欄位", ui.ButtonSet.OK);
      return;
    }

    // 先刪除所有現有的 trigger
    const existingTriggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;
    existingTriggers.forEach(trigger => {
      const handlerFunction = trigger.getHandlerFunction();
      if (handlerFunction === "onOpenUserSpreadsheet" ||
          handlerFunction === "onChangeUserSpreadsheet" ||
          handlerFunction === "onEditUserSpreadsheet") {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
      }
    });
    Logger.log(`已刪除 ${deletedCount} 個現有觸發器`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // 處理每個使用者
    for (let i = 1; i < data.length; i++) {
      const userName = data[i][userNameCol]?.toString().trim();
      const spreadsheetId = data[i][spreadsheetIdCol]?.toString().trim();

      if (!userName || !spreadsheetId) continue;

      try {
        const userSS = SpreadsheetApp.openById(spreadsheetId);
        installTriggerForSpreadsheet(userSS);
        results.push(`${userName}: 成功`);
        successCount++;
      } catch (e) {
        results.push(`${userName}: 失敗（${e.message}）`);
        failCount++;
      }
    }

    // 顯示結果
    const message = `重新安裝觸發器完成\n\n成功: ${successCount} 位使用者\n失敗: ${failCount} 位使用者\n\n詳細結果：\n${results.join("\n")}`;
    ui.alert("重新安裝觸發器", message, ui.ButtonSet.OK);

  } catch (e) {
    ui.alert("錯誤", "重新安裝失敗：" + e.message, ui.ButtonSet.OK);
  }
}

/**
 * 使用者試算表的 onChange 觸發器處理函數
 * @param {Object} e - 事件物件
 */
function onChangeUserSpreadsheet(e) {
  // 只處理「其他」類型的變更（包含工作表切換）
  if (e.changeType === "OTHER") {
    // 根據當前工作表顯示對應的 sidebar
    showSidebarForCurrentSheet();
  }
}

/**
 * 使用者試算表的 onEdit 觸發器處理函數
 * 當有編輯事件發生時，檢查並 refresh 未保護的工作表
 * 使用 debounce 機制避免過於頻繁的刷新
 * @param {Object} e - 事件物件
 */
function onEditUserSpreadsheet(e) {
  try {
    const ss = e.source;
    const sheet = e.range.getSheet();

    // 檢查工作表是否被保護
    const protections = sheet.getProtections(
      SpreadsheetApp.ProtectionType.SHEET
    );
    const isProtected =
      protections.length > 0 && protections.some((p) => !p.canEdit());

    // 跳過保護的工作表和工時記錄表
    if (!isProtected && sheet.getName() !== POMODORO_CONFIG.TIME_SHEET_NAME) {
      // 未保護的任務工作表：執行 refresh 邏輯
      Logger.log(`檢測到未保護工作表的編輯: ${sheet.getName()}`);

      // Debounce 機制：檢查距離上次刷新的時間
      const now = new Date().getTime();
      const scriptProps = PropertiesService.getScriptProperties();
      const lastRefreshKey = "lastSidebarRefresh_" + ss.getId();
      const lastRefresh = parseInt(
        scriptProps.getProperty(lastRefreshKey) || "0"
      );
      const DEBOUNCE_DELAY = 2000; // 2 秒

      if (now - lastRefresh >= DEBOUNCE_DELAY) {
        // 執行檢查和 refresh
        checkAndRefreshUnprotectedSheet(ss, sheet);

        // 觸發 sidebar 刷新
        triggerSidebarRefresh(ss);

        // 更新最後刷新時間
        scriptProps.setProperty(lastRefreshKey, now.toString());
        Logger.log(`已觸發 sidebar 刷新 (debounced)`);
      } else {
        Logger.log(
          `跳過刷新 (debounce 期間內，距離上次 ${now - lastRefresh}ms)`
        );
      }
    }
  } catch (error) {
    Logger.log(`onEditUserSpreadsheet 錯誤: ${error.message}`);
  }
}

/**
 * 觸發 sidebar 刷新
 * 透過設定 UserProperties 標記和 toast 通知
 * @param {SpreadsheetApp.Spreadsheet} ss - 試算表物件
 */
function triggerSidebarRefresh(ss) {
  try {
    // 設定刷新標記
    const props = PropertiesService.getUserProperties();
    const timestamp = new Date().getTime();
    props.setProperty(
      "sidebarRefreshTrigger_" + ss.getId(),
      timestamp.toString()
    );

    // 顯示 toast 通知（不會干擾使用者，但 sidebar 可以偵測到試算表的更新）
    ss.toast("任務清單已更新", "🔄 自動刷新", 1);

    Logger.log(`已觸發 sidebar 刷新: ${timestamp}`);
  } catch (error) {
    Logger.log(`triggerSidebarRefresh 錯誤: ${error.message}`);
  }
}

/**
 * 檢查是否有 sidebar 刷新標記
 * 供 HTML 輪詢使用（但頻率很低，只是為了檢查標記）
 * @returns {Object} {needRefresh: boolean, timestamp: string}
 */
function checkSidebarRefreshTrigger() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const props = PropertiesService.getUserProperties();
    const triggerKey = "sidebarRefreshTrigger_" + ss.getId();
    const lastCheckKey = "sidebarLastCheck_" + ss.getId();

    const trigger = props.getProperty(triggerKey);
    const lastCheck = props.getProperty(lastCheckKey);

    // 如果有刷新標記，且與上次檢查不同
    if (trigger && trigger !== lastCheck) {
      // 更新上次檢查時間
      props.setProperty(lastCheckKey, trigger);

      return {
        needRefresh: true,
        timestamp: trigger,
      };
    }

    return {
      needRefresh: false,
      timestamp: lastCheck || "",
    };
  } catch (error) {
    Logger.log(`checkSidebarRefreshTrigger 錯誤: ${error.message}`);
    return {
      needRefresh: false,
      error: error.message,
    };
  }
}

/**
 * 檢查並 refresh 未保護的工作表
 * @param {SpreadsheetApp.Spreadsheet} ss - 試算表物件
 * @param {SpreadsheetApp.Sheet} sheet - 工作表物件
 */
function checkAndRefreshUnprotectedSheet(ss, sheet) {
  try {
    // 記錄檢查時間
    const now = new Date();
    const timestamp = Utilities.formatDate(
      now,
      "Asia/Taipei",
      "yyyy-MM-dd HH:mm:ss"
    );

    Logger.log(`[${timestamp}] 檢查工作表: ${sheet.getName()}`);

    // 取得所有未保護的工作表
    const unprotectedSheets = getUnprotectedSheets(ss);

    Logger.log(`找到 ${unprotectedSheets.length} 個未保護的工作表`);

    // 對每個未保護的工作表執行 refresh
    unprotectedSheets.forEach((targetSheet) => {
      refreshSheetData(targetSheet);
    });

    // 可選：通知使用者
    // SpreadsheetApp.getActiveSpreadsheet().toast('已刷新未保護的工作表', '自動檢查', 3);
  } catch (error) {
    Logger.log(`checkAndRefreshUnprotectedSheet 錯誤: ${error.message}`);
  }
}

/**
 * 取得所有未保護的工作表
 * @param {SpreadsheetApp.Spreadsheet} ss - 試算表物件
 * @returns {Array<SpreadsheetApp.Sheet>} 未保護的工作表陣列
 */
function getUnprotectedSheets(ss) {
  const sheets = ss.getSheets();
  const unprotectedSheets = [];

  sheets.forEach((sheet) => {
    // 跳過隱藏的工作表和工時記錄表
    if (
      sheet.isSheetHidden() ||
      sheet.getName() === POMODORO_CONFIG.TIME_SHEET_NAME
    ) {
      return;
    }

    // 檢查是否被保護
    const protections = sheet.getProtections(
      SpreadsheetApp.ProtectionType.SHEET
    );
    const isProtected =
      protections.length > 0 && protections.some((p) => !p.canEdit());

    if (!isProtected) {
      unprotectedSheets.push(sheet);
    }
  });

  return unprotectedSheets;
}

/**
 * Refresh 工作表資料（重新計算公式、排序等）
 * @param {SpreadsheetApp.Sheet} sheet - 工作表物件
 */
function refreshSheetData(sheet) {
  try {
    Logger.log(`Refreshing 工作表: ${sheet.getName()}`);

    // 方法 1: 觸發公式重新計算（透過 SpreadsheetApp.flush）
    SpreadsheetApp.flush();

    // 方法 2: 檢查並修正任務序號公式（如果需要）
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    const idColIndex = headers.findIndex(
      (h) => h && h.toString().trim() === "任務序號"
    );
    const nameColIndex = headers.findIndex(
      (h) => h && h.toString().trim() === "任務名稱"
    );

    if (idColIndex !== -1 && nameColIndex !== -1) {
      // 驗證任務序號公式是否正確
      const idCol = idColIndex + 1;
      const firstDataRow = 2;
      const firstIdCell = sheet.getRange(firstDataRow, idCol);
      const formula = firstIdCell.getFormula();

      // 如果公式不存在或不正確，重新設定
      if (!formula || !formula.includes("COUNTIF")) {
        Logger.log(`重新設定任務序號公式: ${sheet.getName()}`);
        const nameColLetter = columnToLetter(nameColIndex + 1);
        const newFormula = `=IF(${nameColLetter}${firstDataRow}<>"", COUNTIF(${nameColLetter}$2:${nameColLetter}${firstDataRow}, "<>"), "")`;
        firstIdCell.setFormula(newFormula);

        // 複製公式到其他列
        const lastRow = sheet.getMaxRows();
        if (lastRow > firstDataRow) {
          firstIdCell.copyTo(
            sheet.getRange(firstDataRow, idCol, lastRow - firstDataRow + 1, 1)
          );
        }
      }
    }

    Logger.log(`已完成 refresh: ${sheet.getName()}`);
  } catch (error) {
    Logger.log(`refreshSheetData 錯誤 (${sheet.getName()}): ${error.message}`);
  }
}

/**
 * 使用者試算表的 onOpen 觸發器處理函數
 * @param {Object} e - 事件物件
 */
function onOpenUserSpreadsheet(e) {
  try {
    Logger.log("=== onOpenUserSpreadsheet 開始 ===");

    const ss = e.source;
    Logger.log("試算表: " + ss.getName());

    const ui = SpreadsheetApp.getUi();
    Logger.log("取得 UI");

    // 建立選單
    ui.createMenu("任務管理")
      .addItem("新增任務", "showTaskSidebar")
      .addItem("番茄鐘", "showPomodoroSidebar")
      .addSeparator()
      .addItem("顯示任務面板", "showTaskSidebar")
      .addItem("顯示番茄鐘", "showPomodoroSidebar")
      .addSeparator()
      .addItem("檢查未保護的工作表", "manualCheckUnprotectedSheets")
      .addToUi();

    Logger.log("選單建立完成");

    // 根據當前工作表自動顯示對應的 sidebar
    Logger.log("準備顯示 sidebar");
    showSidebarForCurrentSheet();
    Logger.log("=== onOpenUserSpreadsheet 結束 ===");

  } catch (error) {
    Logger.log("!!! onOpenUserSpreadsheet 錯誤: " + error.message);
    Logger.log("錯誤堆疊: " + error.stack);
  }
}

/**
 * 手動檢查所有未保護的工作表
 */
function manualCheckUnprotectedSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  try {
    // 取得所有未保護的工作表
    const unprotectedSheets = getUnprotectedSheets(ss);

    if (unprotectedSheets.length === 0) {
      ui.alert("檢查結果", "沒有找到未保護的工作表。", ui.ButtonSet.OK);
      return;
    }

    // 詢問是否要 refresh
    const response = ui.alert(
      "檢查未保護的工作表",
      `找到 ${unprotectedSheets.length} 個未保護的工作表：\n\n` +
        unprotectedSheets.map((s) => `• ${s.getName()}`).join("\n") +
        "\n\n是否要刷新這些工作表？",
      ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
      // 執行 refresh
      unprotectedSheets.forEach((sheet) => {
        refreshSheetData(sheet);
      });

      ui.alert(
        "完成",
        `已刷新 ${unprotectedSheets.length} 個工作表。`,
        ui.ButtonSet.OK
      );
      Logger.log(`手動刷新了 ${unprotectedSheets.length} 個未保護的工作表`);
    }
  } catch (error) {
    ui.alert("錯誤", `檢查失敗: ${error.message}`, ui.ButtonSet.OK);
    Logger.log(`manualCheckUnprotectedSheets 錯誤: ${error.message}`);
  }
}

/**
 * 根據當前工作表顯示對應的 sidebar
 */
function showSidebarForCurrentSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  const sheetName = activeSheet.getName();

  if (sheetName === POMODORO_CONFIG.TIME_SHEET_NAME) {
    // 工時記錄表 -> 顯示番茄鐘
    showPomodoroSidebar();
  } else {
    // 檢查是否為被鎖定的工作表
    const protection = activeSheet.getProtections(
      SpreadsheetApp.ProtectionType.SHEET
    );
    const isLocked =
      protection.length > 0 && protection.some((p) => !p.canEdit());

    if (!isLocked) {
      // 未鎖定的任務列表 -> 顯示新增任務
      showTaskSidebar();
    } else {
      // 已鎖定的工作表 -> 顯示番茄鐘
      showPomodoroSidebar();
    }
  }
}

/**
 * 格式化標題列
 * @param {SpreadsheetApp.Range} range - 標題列範圍
 */
function formatHeaderRow(range) {
  range
    .setBackground(COLORS.HEADER_BG)
    .setFontColor(COLORS.HEADER_TEXT)
    .setFontWeight("bold")
    .setFontSize(11)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      COLORS.BORDER,
      SpreadsheetApp.BorderStyle.SOLID
    );

  // 設定標題列高度
  range.getSheet().setRowHeight(1, 35);
}

/**
 * 格式化標題列（使用自訂配色）
 * @param {SpreadsheetApp.Range} range - 標題列範圍
 * @param {Object} colorScheme - 配色方案
 */
function formatHeaderRowWithColor(range, colorScheme) {
  range
    .setBackground(colorScheme.headerBg)
    .setFontColor(colorScheme.headerText)
    .setFontWeight("bold")
    .setFontSize(11)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      colorScheme.border,
      SpreadsheetApp.BorderStyle.SOLID
    );

  // 設定標題列高度
  range.getSheet().setRowHeight(1, 35);
}

/**
 * 格式化資料欄位
 * @param {SpreadsheetApp.Sheet} sheet - 工作表
 * @param {Array} fieldDefinitions - 欄位定義
 */
function formatDataColumns(sheet, fieldDefinitions) {
  const numRows = 100; // 預設格式化 100 列資料

  fieldDefinitions.forEach((field, index) => {
    const colNum = index + 1;
    const dataRange = sheet.getRange(2, colNum, numRows, 1);
    const bgColor = TYPE_COLORS[field.dataType] || COLORS.DEFAULT_BG;

    // 設定背景色
    dataRange.setBackground(bgColor);

    // 根據資料類型設定格式
    switch (field.dataType) {
      case "number":
      case "integer":
        dataRange.setNumberFormat("#,##0");
        dataRange.setHorizontalAlignment("right");
        break;
      case "float":
        dataRange.setNumberFormat("#,##0.00");
        dataRange.setHorizontalAlignment("right");
        break;
      case "date":
        dataRange.setNumberFormat("yyyy-mm-dd");
        dataRange.setHorizontalAlignment("center");
        break;
      case "datetime":
        dataRange.setNumberFormat("yyyy-mm-dd hh:mm:ss");
        dataRange.setHorizontalAlignment("center");
        break;
      case "boolean":
      case "bool":
        dataRange.setHorizontalAlignment("center");
        break;
      default:
        dataRange.setHorizontalAlignment("left");
    }

    // 設定邊框
    dataRange.setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      COLORS.BORDER,
      SpreadsheetApp.BorderStyle.SOLID
    );
  });
}

/**
 * 格式化資料欄位（使用自訂配色）
 * @param {SpreadsheetApp.Sheet} sheet - 工作表
 * @param {Array} fieldDefinitions - 欄位定義
 * @param {Object} colorScheme - 配色方案
 */
function formatDataColumnsWithColor(sheet, fieldDefinitions, colorScheme) {
  const numRows = 100; // 預設格式化 100 列資料

  fieldDefinitions.forEach((field, index) => {
    const colNum = index + 1;
    const dataRange = sheet.getRange(2, colNum, numRows, 1);

    // 使用自訂配色的淺色背景
    dataRange.setBackground(colorScheme.dataBg);
    dataRange.setFontColor(colorScheme.dataText);

    // 根據資料類型設定格式
    switch (field.dataType) {
      case "number":
      case "integer":
        dataRange.setNumberFormat("#,##0");
        dataRange.setHorizontalAlignment("right");
        break;
      case "float":
        dataRange.setNumberFormat("#,##0.00");
        dataRange.setHorizontalAlignment("right");
        break;
      case "date":
        dataRange.setNumberFormat("yyyy-mm-dd");
        dataRange.setHorizontalAlignment("center");
        break;
      case "datetime":
        dataRange.setNumberFormat("yyyy-mm-dd hh:mm:ss");
        dataRange.setHorizontalAlignment("center");
        break;
      case "boolean":
      case "bool":
        dataRange.setHorizontalAlignment("center");
        break;
      default:
        dataRange.setHorizontalAlignment("left");
    }

    // 設定邊框
    dataRange.setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      colorScheme.border,
      SpreadsheetApp.BorderStyle.SOLID
    );
  });
}

/**
 * 設定欄寬
 * @param {SpreadsheetApp.Sheet} sheet - 工作表
 * @param {Array} fieldDefinitions - 欄位定義
 */
function setColumnWidths(sheet, fieldDefinitions) {
  fieldDefinitions.forEach((field, index) => {
    const colNum = index + 1;
    let width = 120; // 預設寬度

    // 根據標題長度和資料類型調整寬度
    const titleLength = field.title.length;

    if (titleLength > 10) {
      width = Math.max(width, titleLength * 12);
    }

    switch (field.dataType) {
      case "datetime":
        width = Math.max(width, 160);
        break;
      case "date":
        width = Math.max(width, 100);
        break;
      case "boolean":
      case "bool":
        width = Math.max(width, 80);
        break;
    }

    sheet.setColumnWidth(colNum, width);
  });
}

/**
 * 新增資料驗證
 * @param {SpreadsheetApp.Sheet} sheet - 工作表
 * @param {Array} fieldDefinitions - 欄位定義
 * @param {Object} enumDefinitions - enum 定義物件
 */
function addDataValidation(sheet, fieldDefinitions, enumDefinitions) {
  const numRows = 100;

  fieldDefinitions.forEach((field, index) => {
    const colNum = index + 1;
    const dataRange = sheet.getRange(2, colNum, numRows, 1);

    let rule = null;

    switch (field.dataType) {
      case "boolean":
      case "bool":
        // 使用 checkbox
        rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
        break;
      case "number":
      case "integer":
        rule = SpreadsheetApp.newDataValidation()
          .requireNumberGreaterThanOrEqualTo(-999999999)
          .setAllowInvalid(true)
          .build();
        break;
      case "date":
      case "datetime":
        rule = SpreadsheetApp.newDataValidation()
          .requireDate()
          .setAllowInvalid(true)
          .build();
        break;
      case "enum":
        // 使用下拉選單，顏色由使用者自行在 Google Sheets UI 設定
        if (field.enumName && enumDefinitions[field.enumName]) {
          const values = enumDefinitions[field.enumName];
          rule = SpreadsheetApp.newDataValidation()
            .requireValueInList(values, true)
            .setAllowInvalid(false)
            .build();
        }
        break;
    }

    if (rule) {
      dataRange.setDataValidation(rule);
    }
  });
}

/**
 * 將欄位編號轉換為字母（1=A, 2=B, ..., 27=AA）
 * @param {number} column - 欄位編號
 * @returns {string} 欄位字母
 */
function columnToLetter(column) {
  let letter = "";
  while (column > 0) {
    const mod = (column - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    column = Math.floor((column - mod) / 26);
  }
  return letter;
}

/**
 * 為任務序號欄位加入自動產生公式
 * 公式邏輯：如果任務名稱有值，則顯示序號（從1開始累計）
 * @param {SpreadsheetApp.Sheet} sheet - 工作表
 * @param {Array} fieldDefinitions - 欄位定義
 */
function addTaskIdFormulas(sheet, fieldDefinitions) {
  // 找到「任務序號」和「任務名稱」欄位的索引
  const idColIndex = fieldDefinitions.findIndex((f) => f.title === "任務序號");
  const nameColIndex = fieldDefinitions.findIndex(
    (f) => f.title === "任務名稱"
  );

  if (idColIndex === -1 || nameColIndex === -1) {
    Logger.log("找不到「任務序號」或「任務名稱」欄位");
    return;
  }

  const idCol = idColIndex + 1; // 1-indexed
  const nameCol = nameColIndex + 1;
  const nameColLetter = columnToLetter(nameCol);
  const idColLetter = columnToLetter(idCol);

  const numRows = 100;

  // 建立公式陣列
  // 公式：如果任務名稱有值，則計算該列之前（含）有多少個有值的任務名稱
  const formulas = [];
  for (let row = 2; row <= numRows + 1; row++) {
    // =IF(B2<>"", COUNTIF(B$2:B2, "<>"), "")
    const formula = `=IF(${nameColLetter}${row}<>"", COUNTIF(${nameColLetter}$2:${nameColLetter}${row}, "<>"), "")`;
    formulas.push([formula]);
  }

  // 設定公式
  const idRange = sheet.getRange(2, idCol, numRows, 1);
  idRange.setFormulas(formulas);

  Logger.log(`已設定任務序號公式（${idColLetter} 欄）`);
}

/**
 * 新增條件格式
 * @param {SpreadsheetApp.Sheet} sheet - 工作表
 * @param {Array} fieldDefinitions - 欄位定義
 */
function addConditionalFormatting(sheet, fieldDefinitions) {
  // 不再使用交替列顏色，所有資料列都使用統一的背景色
  // 背景色已在 formatDataColumnsWithColor 中設定
}

/**
 * 在目前試算表中建立範例欄位定義工作表
 */
function createSampleFieldDefinitionSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 檢查是否已存在
  let sheet = ss.getSheetByName("欄位定義");
  if (sheet) {
    SpreadsheetApp.getUi().alert(
      "提示",
      '"欄位定義" 工作表已存在。',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  // 建立新工作表
  sheet = ss.insertSheet("欄位定義");

  // 設定標題（第四欄改為 Enum Name）
  const headers = ["Title", "Data Type", "Description", "Enum Name"];
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeaderRow(headerRange);

  // 範例資料（自訂欄位，預設欄位會自動加入）
  const sampleData = [
    ["預估時間", "number", "預估完成所需的番茄鐘數量", ""],
    ["截止日期", "date", "任務的截止日期", ""],
    ["優先順序", "enum", "任務優先順序", "優先順序"],
    ["備註", "string", "任務相關備註", ""],
  ];

  sheet.getRange(2, 1, sampleData.length, 4).setValues(sampleData);

  // 設定欄寬
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 250);
  sheet.setColumnWidth(4, 150);

  // 格式化資料區
  const dataRange = sheet.getRange(2, 1, sampleData.length, 4);
  dataRange.setBorder(
    true,
    true,
    true,
    true,
    true,
    true,
    COLORS.BORDER,
    SpreadsheetApp.BorderStyle.SOLID
  );

  SpreadsheetApp.getUi().alert(
    "成功",
    '已建立 "欄位定義" 工作表，包含範例資料。\n\n' +
      "注意：系統會自動加入以下預設欄位：\n" +
      "• 任務序號\n" +
      "• 任務名稱\n" +
      "• 任務狀態\n\n" +
      "這裡只需定義額外的自訂欄位。",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * 在目前試算表中建立範例 Enum 定義工作表
 */
function createSampleEnumDefinitionSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 檢查是否已存在
  let sheet = ss.getSheetByName("Enum 定義");
  if (sheet) {
    SpreadsheetApp.getUi().alert(
      "提示",
      '"Enum 定義" 工作表已存在。',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  // 建立新工作表
  sheet = ss.insertSheet("Enum 定義");

  // 設定 enum 名稱（第一列）
  const enumNames = ["優先順序", "狀態"];
  sheet.getRange(1, 1, 1, enumNames.length).setValues([enumNames]);

  // 格式化標題列
  const headerRange = sheet.getRange(1, 1, 1, enumNames.length);
  formatHeaderRow(headerRange);

  // 設定「優先順序」選項（第一欄）
  const priorityOptions = ["高", "中", "低"];
  sheet
    .getRange(2, 1, priorityOptions.length, 1)
    .setValues(priorityOptions.map((v) => [v]));

  // 設定「狀態」選項（第二欄）
  const statusOptions = ["待處理", "進行中", "已完成", "已取消"];
  sheet
    .getRange(2, 2, statusOptions.length, 1)
    .setValues(statusOptions.map((v) => [v]));

  // 設定欄寬
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 120);

  // 設定邊框
  const dataRange = sheet.getRange(
    2,
    1,
    Math.max(priorityOptions.length, statusOptions.length),
    2
  );
  dataRange.setBorder(
    true,
    true,
    true,
    true,
    true,
    true,
    COLORS.BORDER,
    SpreadsheetApp.BorderStyle.SOLID
  );

  SpreadsheetApp.getUi().alert(
    "成功",
    '已建立 "Enum 定義" 工作表，包含範例資料。\n\n每欄是一個 enum，第一列是名稱，下方是選項。',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * 為所有使用者試算表建立新的半年度工作表
 * 此函數應該在 1/1 或 7/1 由時間觸發器執行
 */
function createNewHalfYearSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date();
  const halfYearName = getHalfYearName(now);

  // 讀取試算表清單
  const listSheet = ss.getSheetByName("試算表清單");
  if (!listSheet) {
    Logger.log("找不到「試算表清單」工作表");
    return;
  }

  // 讀取欄位定義和 enum 定義
  const fieldDefinitions = readFieldDefinitions(ss);
  const enumDefinitions = readEnumDefinitions(ss);

  // 取得所有試算表
  const data = listSheet.getDataRange().getValues();
  let successCount = 0;
  let errorCount = 0;

  for (let i = 1; i < data.length; i++) {
    const spreadsheetId = data[i][2];
    const userName = data[i][0];
    if (!spreadsheetId) continue;

    try {
      const targetSS = SpreadsheetApp.openById(spreadsheetId);

      // 檢查是否已有該半年度的工作表
      if (targetSS.getSheetByName(halfYearName)) {
        Logger.log(`${userName}: ${halfYearName} 工作表已存在，跳過`);
        continue;
      }

      // 建立新的半年度工作表
      createHalfYearSheet(
        targetSS,
        halfYearName,
        fieldDefinitions,
        enumDefinitions
      );
      successCount++;
      Logger.log(`${userName}: 已建立 ${halfYearName} 工作表`);
    } catch (e) {
      errorCount++;
      Logger.log(`${userName}: 建立失敗 - ${e.message}`);
    }
  }

  Logger.log(`半年度工作表建立完成: 成功 ${successCount}, 失敗 ${errorCount}`);
}

/**
 * 為單一試算表建立新的半年度工作表
 * @param {SpreadsheetApp.Spreadsheet} targetSS - 目標試算表
 * @param {string} halfYearName - 半年度名稱（如 "2025 H1"）
 * @param {Array} fieldDefinitions - 欄位定義
 * @param {Object} enumDefinitions - enum 定義
 */
function createHalfYearSheet(
  targetSS,
  halfYearName,
  fieldDefinitions,
  enumDefinitions
) {
  // 找到最新的工作表（排除已隱藏的）
  const sheets = targetSS.getSheets();
  let previousSheet = null;

  // 找到最後一個可見的 sheet（應該是前一個半年度）
  for (let i = sheets.length - 1; i >= 0; i--) {
    if (!sheets[i].isSheetHidden()) {
      previousSheet = sheets[i];
      break;
    }
  }

  // 取得配色方案（從試算表屬性或使用預設）
  let colorScheme;
  try {
    const props = PropertiesService.getDocumentProperties();
    const savedScheme = props.getProperty("colorScheme_" + targetSS.getId());
    colorScheme = savedScheme
      ? JSON.parse(savedScheme)
      : generateColorScheme("#4285F4");
  } catch (e) {
    colorScheme = generateColorScheme("#4285F4");
  }

  // 建立新工作表
  const newSheet = targetSS.insertSheet(halfYearName);

  // 設定欄位標題
  const headers = fieldDefinitions.map((f) => f.title);
  const headerRange = newSheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);

  // 格式化標題列
  formatHeaderRowWithColor(headerRange, colorScheme);

  // 設定各欄位格式
  formatDataColumnsWithColor(newSheet, fieldDefinitions, colorScheme);

  // 設定欄寬
  setColumnWidths(newSheet, fieldDefinitions);

  // 凍結標題列
  newSheet.setFrozenRows(1);

  // 新增資料驗證
  addDataValidation(newSheet, fieldDefinitions, enumDefinitions);

  // 新增條件格式
  addConditionalFormatting(newSheet, fieldDefinitions);

  // 如果有前一個工作表，複製未完成的任務
  if (previousSheet) {
    migrateUnfinishedTasks(previousSheet, newSheet, fieldDefinitions);

    // 鎖定並隱藏舊工作表
    lockAndHideSheet(previousSheet);
  }

  // 設定任務序號公式（要在遷移任務之後執行，避免公式被覆蓋）
  addTaskIdFormulas(newSheet, fieldDefinitions);
}

/**
 * 遷移未完成的任務到新工作表
 * @param {SpreadsheetApp.Sheet} sourceSheet - 來源工作表
 * @param {SpreadsheetApp.Sheet} targetSheet - 目標工作表
 * @param {Array} fieldDefinitions - 欄位定義
 */
function migrateUnfinishedTasks(sourceSheet, targetSheet, fieldDefinitions) {
  const sourceData = sourceSheet.getDataRange().getValues();
  if (sourceData.length <= 1) return; // 只有標題列

  // 找到「任務狀態」和「任務序號」欄位的索引
  const statusColIndex = fieldDefinitions.findIndex(
    (f) => f.title === "任務狀態"
  );
  const idColIndex = fieldDefinitions.findIndex((f) => f.title === "任務序號");

  if (statusColIndex === -1) {
    Logger.log("找不到「任務狀態」欄位");
    return;
  }

  // 收集需要遷移的任務
  const tasksToMigrate = [];
  for (let i = 1; i < sourceData.length; i++) {
    const row = sourceData[i];
    const status = row[statusColIndex]?.toString().trim();

    // 檢查是否需要遷移（進行中、擱置中、準備中）
    if (CARRY_OVER_STATUSES.includes(status)) {
      // 複製資料列，但清空任務序號（因為會由公式自動產生）
      const newRow = [...row];
      if (idColIndex !== -1) {
        newRow[idColIndex] = ""; // 清空序號，讓公式自動計算
      }
      tasksToMigrate.push(newRow);
    }
  }

  if (tasksToMigrate.length === 0) {
    Logger.log("沒有需要遷移的任務");
    return;
  }

  // 將任務寫入新工作表（從第 2 列開始，但要跳過任務序號欄位的公式）
  // 先寫入除了任務序號以外的欄位
  if (idColIndex !== -1) {
    // 分段寫入：序號欄位之前、序號欄位之後
    const numCols = fieldDefinitions.length;

    // 寫入序號之後的欄位（從第 2 欄開始）
    if (idColIndex === 0) {
      // 序號是第一欄，寫入第 2 欄到最後
      const dataWithoutId = tasksToMigrate.map((row) => row.slice(1));
      targetSheet
        .getRange(2, 2, tasksToMigrate.length, numCols - 1)
        .setValues(dataWithoutId);
    } else {
      // 序號不是第一欄，需要分段寫入
      // 寫入序號之前的欄位
      const dataBefore = tasksToMigrate.map((row) => row.slice(0, idColIndex));
      targetSheet
        .getRange(2, 1, tasksToMigrate.length, idColIndex)
        .setValues(dataBefore);

      // 寫入序號之後的欄位
      if (idColIndex < numCols - 1) {
        const dataAfter = tasksToMigrate.map((row) =>
          row.slice(idColIndex + 1)
        );
        targetSheet
          .getRange(
            2,
            idColIndex + 2,
            tasksToMigrate.length,
            numCols - idColIndex - 1
          )
          .setValues(dataAfter);
      }
    }
  } else {
    // 沒有序號欄位，直接寫入全部
    targetSheet
      .getRange(2, 1, tasksToMigrate.length, fieldDefinitions.length)
      .setValues(tasksToMigrate);
  }

  Logger.log(`已遷移 ${tasksToMigrate.length} 個任務`);
}

/**
 * 鎖定並隱藏工作表
 * @param {SpreadsheetApp.Sheet} sheet - 要鎖定的工作表
 */
function lockAndHideSheet(sheet) {
  // 保護整個工作表
  const protection = sheet.protect();
  protection.setDescription("已封存的半年度任務");

  // 設定為僅限自己編輯（或移除所有編輯者只留擁有者）
  protection.removeEditors(protection.getEditors());
  if (protection.canDomainEdit()) {
    protection.setDomainEdit(false);
  }

  // 隱藏工作表
  sheet.hideSheet();

  Logger.log(`已鎖定並隱藏工作表: ${sheet.getName()}`);
}

/**
 * 手動觸發建立新半年度工作表
 */
function manualCreateNewHalfYear() {
  const ui = SpreadsheetApp.getUi();
  const now = new Date();
  const halfYearName = getHalfYearName(now);

  const response = ui.alert(
    "建立新半年度",
    `將為所有使用者建立 "${halfYearName}" 工作表。\n\n` +
      "此操作會：\n" +
      "1. 建立新的半年度工作表\n" +
      "2. 將進行中、擱置中、準備中的任務複製過來\n" +
      "3. 鎖定並隱藏舊的工作表\n\n" +
      "是否繼續？",
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  createNewHalfYearSheets();

  ui.alert(
    "完成",
    `已建立 ${halfYearName} 工作表。\n請查看執行記錄以了解詳情。`,
    ui.ButtonSet.OK
  );
}

/**
 * 安裝半年度自動建立觸發器
 */
function installHalfYearTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 移除舊的觸發器
  const triggers = ScriptApp.getUserTriggers(ss);
  triggers.forEach((trigger) => {
    if (trigger.getHandlerFunction() === "checkAndCreateHalfYearSheets") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 建立每日觸發器（在凌晨 1 點檢查）
  ScriptApp.newTrigger("checkAndCreateHalfYearSheets")
    .timeBased()
    .atHour(1)
    .everyDays(1)
    .create();

  SpreadsheetApp.getUi().alert(
    "觸發器已安裝",
    "已安裝每日檢查觸發器。\n系統會在每天凌晨 1 點檢查是否需要建立新的半年度工作表（1/1 或 7/1）。",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * 每日檢查是否需要建立新的半年度工作表
 * 此函數由時間觸發器呼叫
 */
function checkAndCreateHalfYearSheets() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  const day = now.getDate();

  // 只在 1/1 或 7/1 執行
  if ((month === 1 && day === 1) || (month === 7 && day === 1)) {
    Logger.log(`今天是 ${month}/${day}，開始建立新的半年度工作表`);
    createNewHalfYearSheets();
  }
}

/**
 * 測試用：模擬指定日期建立半年度工作表
 * 可以用來測試 H1/H2 切換功能
 */
function testCreateHalfYearWithDate() {
  const ui = SpreadsheetApp.getUi();

  // 詢問要模擬的日期
  const response = ui.prompt(
    "測試半年度切換",
    "請輸入要模擬的日期（格式：YYYY-MM-DD）\n\n" +
      "例如：\n" +
      "• 2025-01-01 會建立 2025 H1\n" +
      "• 2025-07-01 會建立 2025 H2\n" +
      "• 2026-01-01 會建立 2026 H1",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const dateStr = response.getResponseText().trim();
  const testDate = new Date(dateStr);

  if (isNaN(testDate.getTime())) {
    ui.alert(
      "錯誤",
      "日期格式不正確，請使用 YYYY-MM-DD 格式。",
      ui.ButtonSet.OK
    );
    return;
  }

  const halfYearName = getHalfYearName(testDate);

  // 確認
  const confirmResponse = ui.alert(
    "確認測試",
    `將模擬日期 ${dateStr} 建立 "${halfYearName}" 工作表。\n\n` +
      "此操作會：\n" +
      "1. 建立新的半年度工作表\n" +
      "2. 將進行中、擱置中、準備中的任務複製過來\n" +
      "3. 鎖定並隱藏舊的工作表\n\n" +
      "是否繼續？",
    ui.ButtonSet.YES_NO
  );

  if (confirmResponse !== ui.Button.YES) {
    return;
  }

  // 執行測試
  createNewHalfYearSheetsWithDate(testDate);

  ui.alert(
    "測試完成",
    `已建立 ${halfYearName} 工作表。\n請查看執行記錄以了解詳情。`,
    ui.ButtonSet.OK
  );
}

/**
 * 使用指定日期建立半年度工作表（測試用）
 * @param {Date} date - 模擬的日期
 */
function createNewHalfYearSheetsWithDate(date) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const halfYearName = getHalfYearName(date);

  // 讀取試算表清單
  const listSheet = ss.getSheetByName("試算表清單");
  if (!listSheet) {
    Logger.log("找不到「試算表清單」工作表");
    return;
  }

  // 讀取欄位定義和 enum 定義
  const fieldDefinitions = readFieldDefinitions(ss);
  const enumDefinitions = readEnumDefinitions(ss);

  // 取得所有試算表
  const data = listSheet.getDataRange().getValues();
  let successCount = 0;
  let errorCount = 0;

  for (let i = 1; i < data.length; i++) {
    const spreadsheetId = data[i][2];
    const userName = data[i][0];
    if (!spreadsheetId) continue;

    try {
      const targetSS = SpreadsheetApp.openById(spreadsheetId);

      // 檢查是否已有該半年度的工作表
      if (targetSS.getSheetByName(halfYearName)) {
        Logger.log(`${userName}: ${halfYearName} 工作表已存在，跳過`);
        continue;
      }

      // 建立新的半年度工作表
      createHalfYearSheet(
        targetSS,
        halfYearName,
        fieldDefinitions,
        enumDefinitions
      );
      successCount++;
      Logger.log(`${userName}: 已建立 ${halfYearName} 工作表`);
    } catch (e) {
      errorCount++;
      Logger.log(`${userName}: 建立失敗 - ${e.message}`);
    }
  }

  Logger.log(
    `[測試] 半年度工作表建立完成: 成功 ${successCount}, 失敗 ${errorCount}`
  );
}

/**
 * 測試用：顯示目前的半年度資訊
 */
function showCurrentHalfYearInfo() {
  const ui = SpreadsheetApp.getUi();
  const now = new Date();
  const halfYearName = getHalfYearName(now);

  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let nextTransition;
  let nextHalfYear;
  if (month <= 6) {
    nextTransition = `${year}-07-01`;
    nextHalfYear = `${year} H2`;
  } else {
    nextTransition = `${year + 1}-01-01`;
    nextHalfYear = `${year + 1} H1`;
  }

  ui.alert(
    "半年度資訊",
    `目前日期：${Utilities.formatDate(now, "Asia/Taipei", "yyyy-MM-dd")}\n` +
      `目前半年度：${halfYearName}\n\n` +
      `下次切換日期：${nextTransition}\n` +
      `下個半年度：${nextHalfYear}`,
    ui.ButtonSet.OK
  );
}

/**
 * 新增自訂選單（主試算表）
 * 注意：使用者試算表使用 onOpenUserSpreadsheet（透過 installable trigger）
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  // 主試算表的選單
  ui.createMenu("試算表產生器")
    .addItem("建立範例欄位定義", "createSampleFieldDefinitionSheet")
    .addItem("建立範例 Enum 定義", "createSampleEnumDefinitionSheet")
    .addSeparator()
    .addItem("產生格式化試算表", "createFormattedSpreadsheet")
    .addItem("新增任務到使用者", "showUserTaskSidebar")
    .addItem("同步分類設定到使用者", "syncCategoryConfigToUsers")
    .addSeparator()
    .addItem("建立新半年度工作表", "manualCreateNewHalfYear")
    .addItem("安裝半年度自動觸發器", "installHalfYearTrigger")
    .addItem("重新安裝使用者觸發器", "reinstallTriggersForAllUsers")
    .addSeparator()
    .addSubMenu(
      ui
        .createMenu("測試工具")
        .addItem("模擬日期建立半年度", "testCreateHalfYearWithDate")
        .addItem("顯示目前半年度資訊", "showCurrentHalfYearInfo")
        .addSeparator()
        .addItem("填入範例分類設定", "fillSampleCategoryConfig")
        .addSeparator()
        .addItem("🗑️ 清除所有使用者資料", "cleanupAllUserData")
    )
    .addToUi();
}

/**
 * 顯示任務新增 sidebar（如果當前工作表未被鎖定）
 */
function showTaskSidebarIfNotLocked() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();

  // 檢查工作表是否被保護（鎖定）
  const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);

  if (protections.length > 0) {
    // 工作表已被鎖定，不顯示 sidebar
    Logger.log(`工作表 "${sheet.getName()}" 已被鎖定，不顯示新增任務面板`);
    return;
  }

  // 顯示 sidebar
  showTaskSidebar();
}

/**
 * 顯示任務新增 sidebar
 */
function showTaskSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("TaskForm")
    .setTitle("新增任務")
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * 顯示使用者選擇對話框，然後打開新增任務 sidebar
 */
function showUserTaskSidebar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const listSheet = ss.getSheetByName("試算表清單");

  if (!listSheet) {
    SpreadsheetApp.getUi().alert(
      "錯誤",
      "找不到「試算表清單」工作表。請先建立使用者試算表。",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const html = HtmlService.createHtmlOutputFromFile("UserSelector")
    .setWidth(400)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, "選擇使用者");
}

/**
 * 取得所有使用者清單
 * @returns {Array} 使用者清單 [{name, spreadsheetId, sheetName}]
 */
function getUserList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const listSheet = ss.getSheetByName("試算表清單");

  if (!listSheet) {
    return [];
  }

  const data = listSheet.getDataRange().getValues();
  const users = [];

  for (let i = 1; i < data.length; i++) {
    const userName = data[i][0];
    const spreadsheetId = data[i][2];

    if (userName && spreadsheetId) {
      try {
        const targetSS = SpreadsheetApp.openById(spreadsheetId);
        const sheets = targetSS.getSheets();

        // 找到最新的未鎖定工作表
        let activeSheetName = null;
        for (let j = sheets.length - 1; j >= 0; j--) {
          const sheet = sheets[j];
          if (!sheet.isSheetHidden()) {
            const protections = sheet.getProtections(
              SpreadsheetApp.ProtectionType.SHEET
            );
            if (protections.length === 0) {
              activeSheetName = sheet.getName();
              break;
            }
          }
        }

        if (activeSheetName) {
          users.push({
            name: userName,
            spreadsheetId: spreadsheetId,
            sheetName: activeSheetName,
          });
        }
      } catch (e) {
        Logger.log(`無法讀取 ${userName} 的試算表: ${e.message}`);
      }
    }
  }

  return users;
}

/**
 * 設定當前操作的目標試算表（儲存到使用者屬性）
 * @param {string} spreadsheetId - 試算表 ID
 * @param {string} sheetName - 工作表名稱
 */
function setTargetSpreadsheet(spreadsheetId, sheetName) {
  const props = PropertiesService.getUserProperties();
  props.setProperty("targetSpreadsheetId", spreadsheetId);
  props.setProperty("targetSheetName", sheetName);
}

/**
 * 取得當前操作的目標試算表資訊
 * @returns {Object} {spreadsheetId, sheetName}
 */
function getTargetSpreadsheet() {
  const props = PropertiesService.getUserProperties();
  return {
    spreadsheetId: props.getProperty("targetSpreadsheetId"),
    sheetName: props.getProperty("targetSheetName"),
  };
}

/**
 * 取得任務表單所需的資料（欄位定義和 enum 定義）
 * @returns {Object} 包含 fields 和 enums 的物件
 */
function getTaskFormData() {
  try {
    // 先取得當前試算表
    const currentSS = SpreadsheetApp.getActiveSpreadsheet();
    const isUserTaskList = currentSS.getName().includes("_任務列表");

    let ss, sheet;
    let targetInfo = null;

    if (isUserTaskList) {
      // 在使用者試算表中，直接使用當前試算表
      ss = currentSS;
      sheet = ss.getActiveSheet();
    } else {
      // 在主試算表中，檢查是否有指定目標
      const target = getTargetSpreadsheet();

      if (target.spreadsheetId && target.sheetName) {
        // 使用指定的目標試算表
        ss = SpreadsheetApp.openById(target.spreadsheetId);
        sheet = ss.getSheetByName(target.sheetName);

        if (!sheet) {
          return { error: `找不到工作表: ${target.sheetName}` };
        }

        targetInfo = {
          userName: ss.getName().replace("_任務列表", ""),
          sheetName: target.sheetName,
        };
      } else {
        return { error: "請先選擇使用者" };
      }
    }

    // 檢查工作表是否被鎖定
    const protections = sheet.getProtections(
      SpreadsheetApp.ProtectionType.SHEET
    );
    if (protections.length > 0) {
      return { error: "此工作表已被鎖定，無法新增任務" };
    }

    // 從標題列讀取欄位定義
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];

    // 建構欄位定義（基於標題和預設欄位）
    const fields = [];

    headers.forEach((header, index) => {
      if (!header) return;

      const headerStr = header.toString().trim();

      // 從 DEFAULT_FIELDS 查找
      const defaultField = DEFAULT_FIELDS.find((f) => f.title === headerStr);

      if (defaultField) {
        fields.push(defaultField);
      } else {
        // 嘗試推斷資料類型
        const field = {
          title: headerStr,
          dataType: guessDataType(headerStr),
          description: "",
          enumName: "",
        };
        fields.push(field);
      }
    });

    // 取得 enum 定義（使用內建的）
    const enums = JSON.parse(JSON.stringify(BUILTIN_ENUMS));

    // 加入使用者的分類設定作為「任務分類」enum
    let userName = "";
    if (targetInfo) {
      userName = targetInfo.userName;
    } else if (isUserTaskList) {
      userName = currentSS.getName().replace("_任務列表", "");
    }

    if (userName) {
      // 讀取主試算表
      const scriptProps = PropertiesService.getScriptProperties();
      const mainSSId = scriptProps.getProperty("mainSpreadsheetId");
      if (mainSSId) {
        try {
          const mainSS = SpreadsheetApp.openById(mainSSId);
          const categoryConfig = getUserCategoryConfig(mainSS, userName);
          if (categoryConfig.success && categoryConfig.categories.length > 0) {
            enums["任務分類"] = categoryConfig.categories.map(cat => cat.name);
          }
        } catch (e) {
          Logger.log("讀取分類設定失敗: " + e.message);
        }
      }
    }

    return {
      fields: fields,
      enums: enums,
      targetInfo: targetInfo,
    };
  } catch (e) {
    Logger.log("getTaskFormData 錯誤: " + e.message);
    return { error: e.message };
  }
}

/**
 * 根據欄位名稱推斷資料類型
 * @param {string} fieldName - 欄位名稱
 * @returns {string} 資料類型
 */
function guessDataType(fieldName) {
  const name = fieldName.toLowerCase();

  if (name.includes("日期") || name.includes("date")) {
    return "date";
  }
  if (name.includes("時間") || name.includes("time")) {
    return "datetime";
  }
  if (
    name.includes("數量") ||
    name.includes("數") ||
    name.includes("次") ||
    name.includes("number") ||
    name.includes("count") ||
    name.includes("amount")
  ) {
    return "number";
  }
  if (name.includes("是否") || name.includes("已") || name.includes("完成")) {
    return "boolean";
  }
  if (
    name.includes("備註") ||
    name.includes("說明") ||
    name.includes("描述") ||
    name.includes("note") ||
    name.includes("description")
  ) {
    return "text";
  }

  return "string";
}

/**
 * 新增任務到當前工作表
 * @param {Object} taskData - 任務資料物件
 * @returns {Object} 結果物件 {success: boolean, error?: string}
 */
function addTask(taskData) {
  try {
    Logger.log("=== addTask 開始 ===");
    Logger.log("收到的 taskData: " + JSON.stringify(taskData));

    // 先取得當前試算表
    const currentSS = SpreadsheetApp.getActiveSpreadsheet();
    const currentSSName = currentSS ? currentSS.getName() : "(null)";
    const isUserTaskList = currentSSName.includes("_任務列表");

    Logger.log("當前試算表名稱: " + currentSSName);
    Logger.log("是否為使用者任務列表: " + isUserTaskList);

    let ss, sheet;

    if (isUserTaskList) {
      // 在使用者試算表中，直接使用當前試算表
      ss = currentSS;
      sheet = ss.getActiveSheet();
      Logger.log("使用當前試算表的 ActiveSheet: " + sheet.getName());
    } else {
      // 在主試算表中，檢查是否有指定目標
      const target = getTargetSpreadsheet();
      Logger.log("目標設定: " + JSON.stringify(target));

      if (target.spreadsheetId && target.sheetName) {
        // 使用指定的目標試算表
        ss = SpreadsheetApp.openById(target.spreadsheetId);
        sheet = ss.getSheetByName(target.sheetName);

        if (!sheet) {
          Logger.log("錯誤: 找不到工作表 " + target.sheetName);
          return { success: false, error: `找不到工作表: ${target.sheetName}` };
        }
        Logger.log("使用目標試算表: " + ss.getName() + " / " + sheet.getName());
      } else {
        Logger.log("錯誤: 未設定目標試算表");
        return { success: false, error: "請先選擇使用者" };
      }
    }

    // 檢查工作表是否被鎖定
    const protections = sheet.getProtections(
      SpreadsheetApp.ProtectionType.SHEET
    );
    if (protections.length > 0) {
      Logger.log("錯誤: 工作表已被鎖定");
      return { success: false, error: "此工作表已被鎖定，無法新增任務" };
    }

    // 取得標題列
    const lastCol = sheet.getLastColumn();
    Logger.log("工作表最後一欄: " + lastCol);

    if (lastCol === 0) {
      Logger.log("錯誤: 工作表沒有任何欄位");
      return { success: false, error: "工作表沒有任何欄位" };
    }

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    Logger.log("標題列: " + JSON.stringify(headers));

    // 建立新列資料
    const newRow = [];

    headers.forEach((header, index) => {
      if (!header) {
        newRow.push("");
        return;
      }

      const headerStr = header.toString().trim();

      // 任務序號由公式自動計算，所以留空
      if (headerStr === "任務序號") {
        newRow.push("");
        return;
      }

      const value = taskData[headerStr];

      // 處理不同類型的值
      if (value === undefined || value === null) {
        newRow.push("");
      } else if (typeof value === "boolean") {
        newRow.push(value);
      } else {
        newRow.push(value);
      }
    });

    Logger.log("準備寫入的資料: " + JSON.stringify(newRow));

    // 找到任務名稱欄位的索引（用來判斷最後一列有資料的位置）
    const nameColIndex = headers.findIndex(
      (h) => h.toString().trim() === "任務名稱"
    );
    Logger.log("任務名稱欄位索引: " + nameColIndex);

    // 找到最後一列有資料的位置（以任務名稱欄位為準，避免被任務序號公式影響）
    let lastRow = 1; // 至少有標題列
    if (nameColIndex !== -1) {
      const nameCol = nameColIndex + 1; // 1-indexed
      const nameColData = sheet
        .getRange(1, nameCol, sheet.getMaxRows(), 1)
        .getValues();

      // 從後往前找第一個非空的值
      for (let i = nameColData.length - 1; i >= 0; i--) {
        if (nameColData[i][0] !== "" && nameColData[i][0] !== null) {
          lastRow = i + 1; // 轉為 1-indexed
          break;
        }
      }
      Logger.log("依任務名稱欄位判斷，最後一列有資料: " + lastRow);
    } else {
      // 如果沒有任務名稱欄位，fallback 到 getLastRow
      lastRow = sheet.getLastRow();
      Logger.log("工作表最後一列 (fallback getLastRow): " + lastRow);
    }

    // 在最後一列之後插入新資料
    const newRowNum = lastRow + 1;
    Logger.log("新資料將寫入第 " + newRowNum + " 列");

    // 寫入資料（跳過任務序號欄位，因為它有公式）
    const idColIndex = headers.findIndex(
      (h) => h.toString().trim() === "任務序號"
    );
    Logger.log("任務序號欄位索引: " + idColIndex);

    if (idColIndex !== -1) {
      // 分段寫入，跳過任務序號欄位
      const numCols = headers.length;

      if (idColIndex === 0) {
        // 序號是第一欄，寫入第 2 欄到最後
        const dataWithoutId = newRow.slice(1);
        Logger.log(
          "序號在第一欄，寫入第 2 欄開始的資料: " +
            JSON.stringify(dataWithoutId)
        );
        if (dataWithoutId.length > 0) {
          const range = sheet.getRange(newRowNum, 2, 1, dataWithoutId.length);
          Logger.log(
            "寫入範圍: 第 " +
              newRowNum +
              " 列, 第 2 到 " +
              (1 + dataWithoutId.length) +
              " 欄"
          );
          range.setValues([dataWithoutId]);
          Logger.log("資料已寫入");
        }
      } else {
        // 寫入序號之前的欄位
        const dataBefore = newRow.slice(0, idColIndex);
        if (dataBefore.length > 0) {
          Logger.log("寫入序號之前的資料: " + JSON.stringify(dataBefore));
          sheet
            .getRange(newRowNum, 1, 1, dataBefore.length)
            .setValues([dataBefore]);
        }

        // 寫入序號之後的欄位
        if (idColIndex < numCols - 1) {
          const dataAfter = newRow.slice(idColIndex + 1);
          if (dataAfter.length > 0) {
            Logger.log("寫入序號之後的資料: " + JSON.stringify(dataAfter));
            sheet
              .getRange(newRowNum, idColIndex + 2, 1, dataAfter.length)
              .setValues([dataAfter]);
          }
        }
      }
    } else {
      // 沒有序號欄位，直接寫入全部
      Logger.log("沒有序號欄位，寫入全部資料");
      sheet.getRange(newRowNum, 1, 1, newRow.length).setValues([newRow]);
    }

    // 後驗證：檢查資料是否成功寫入
    SpreadsheetApp.flush(); // 強制執行所有待處理的更改
    const verifyRange = sheet.getRange(newRowNum, 1, 1, lastCol);
    const verifyData = verifyRange.getValues()[0];
    Logger.log(
      "後驗證 - 第 " + newRowNum + " 列的資料: " + JSON.stringify(verifyData)
    );

    // 檢查任務名稱是否已寫入
    if (nameColIndex !== -1) {
      const writtenName = verifyData[nameColIndex];
      Logger.log('後驗證 - 任務名稱欄位值: "' + writtenName + '"');
      if (!writtenName || writtenName.toString().trim() === "") {
        Logger.log("警告: 任務名稱欄位為空!");
      }
    }

    Logger.log("=== addTask 完成 ===");
    Logger.log(`已新增任務: ${taskData["任務名稱"]}`);

    return { success: true };
  } catch (e) {
    Logger.log("addTask 錯誤: " + e.message);
    Logger.log("錯誤堆疊: " + e.stack);
    return { success: false, error: e.message };
  }
}

// ==================== 番茄鐘功能 ====================

// 番茄鐘設定
const POMODORO_CONFIG = {
  DEFAULT_WORK_DURATION: 30, // 預設工作時間（分鐘）
  MIN_WORK_DURATION: 5, // 最小工作時間（分鐘）
  MAX_WORK_DURATION: 120, // 最大工作時間（分鐘）
  TIME_SHEET_NAME: "工時記錄",
  CATEGORY_CONFIG_PREFIX: "分類設定_", // 分類設定表名稱前綴
};

// ==================== 分類配置系統 ====================

/**
 * 取得當前使用者名稱（從試算表名稱或分享設定推斷）
 * @param {Spreadsheet} ss - 試算表物件
 * @returns {string} 使用者名稱
 */
function getCurrentUserName(ss) {
  try {
    const spreadsheetName = ss.getName();

    // 方法1: 從試算表名稱中提取（格式：張三_任務列表）
    const match1 = spreadsheetName.match(/^(.+)_任務列表$/);
    if (match1 && match1[1]) {
      return match1[1].trim();
    }

    // 方法2: 舊格式（任務管理_張三）
    const match2 = spreadsheetName.match(/任務管理[_-](.+)/);
    if (match2 && match2[1]) {
      return match2[1].trim();
    }

    // 方法3: 使用當前使用者的 email 前綴
    try {
      const email = Session.getActiveUser().getEmail();
      if (email) {
        const userName = email.split("@")[0];
        return userName;
      }
    } catch (emailError) {
      // 忽略權限錯誤
    }

    // 預設值
    return "預設使用者";
  } catch (e) {
    Logger.log("getCurrentUserName 錯誤: " + e.message);
    return "預設使用者";
  }
}

/**
 * 讀取使用者的分類設定
 * @param {Spreadsheet} ss - 試算表物件
 * @param {string} userName - 使用者名稱
 * @returns {Object} 分類設定 { categories: [{name, limit, description}], isValid: boolean, error?: string }
 */
function getUserCategoryConfig(ss, userName) {
  try {
    const configSheetName = POMODORO_CONFIG.CATEGORY_CONFIG_PREFIX + userName;
    const configSheet = ss.getSheetByName(configSheetName);

    if (!configSheet) {
      return {
        success: false,
        categories: [],
        isValid: false,
        error: `找不到分類設定表：${configSheetName}`,
      };
    }

    const data = configSheet.getDataRange().getValues();
    if (data.length < 2) {
      return {
        success: false,
        categories: [],
        isValid: false,
        error: "分類設定表為空",
      };
    }

    // 讀取標題列（假設第一列）
    const headers = data[0];
    const nameColIndex = headers.findIndex(
      (h) => h.toString().trim() === "分類名稱"
    );
    const limitColIndex = headers.findIndex((h) =>
      h.toString().trim().includes("資源配比上限")
    );
    const descColIndex = headers.findIndex(
      (h) => h.toString().trim() === "說明"
    );

    if (nameColIndex === -1 || limitColIndex === -1) {
      return {
        success: false,
        categories: [],
        isValid: false,
        error: "分類設定表缺少必要欄位：分類名稱、資源配比上限",
      };
    }

    // 讀取分類資料
    const categories = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const name = row[nameColIndex]?.toString().trim();
      const limit = parseFloat(row[limitColIndex]);

      if (!name || isNaN(limit)) {
        continue; // 跳過無效列
      }

      categories.push({
        name: name,
        limit: limit,
        description:
          descColIndex !== -1 ? row[descColIndex]?.toString().trim() : "",
      });
    }

    if (categories.length === 0) {
      return {
        success: false,
        categories: [],
        isValid: false,
        error: "沒有有效的分類設定",
      };
    }

    // 驗證配比總和
    const isValid = validateCategoryLimits(categories);
    const totalLimit = categories.reduce((sum, cat) => sum + cat.limit, 0);

    return {
      success: true,
      categories: categories,
      isValid: isValid,
      totalLimit: totalLimit,
      error: isValid ? null : `資源配比總和為 ${totalLimit}%，必須等於 100%`,
    };
  } catch (e) {
    Logger.log("getUserCategoryConfig 錯誤: " + e.message);
    return {
      success: false,
      categories: [],
      isValid: false,
      error: e.message,
    };
  }
}

/**
 * 驗證分類配比總和是否為 100%
 * @param {Array} categories - 分類陣列 [{name, limit, description}]
 * @returns {boolean}
 */
function validateCategoryLimits(categories) {
  const total = categories.reduce((sum, cat) => sum + cat.limit, 0);
  // 允許小數點誤差 ±0.1
  return Math.abs(total - 100) < 0.1;
}

/**
 * 建立空的分類設定表（在主試算表中）
 * @param {Spreadsheet} ss - 主試算表物件
 * @param {string} userName - 使用者名稱
 * @returns {Object} 結果物件 {success: boolean, sheetName?: string, message?: string, error?: string}
 */
function createEmptyCategoryConfigSheet(ss, userName) {
  try {
    const configSheetName = POMODORO_CONFIG.CATEGORY_CONFIG_PREFIX + userName;

    // 檢查是否已存在該設定表
    let configSheet = ss.getSheetByName(configSheetName);
    if (configSheet) {
      Logger.log(`分類設定表「${configSheetName}」已存在，跳過建立`);
      return {
        success: true,
        sheetName: configSheetName,
        message: `分類設定表「${configSheetName}」已存在`,
        alreadyExists: true
      };
    }

    // 建立新的分類設定表
    configSheet = ss.insertSheet(configSheetName);

    // 設定標題列
    const headers = ["分類名稱", "資源配比上限(%)", "說明"];
    configSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // 設定標題列格式
    const headerRange = configSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#4285F4");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");

    // 設定欄位格式
    configSheet.setColumnWidth(1, 120); // 分類名稱
    configSheet.setColumnWidth(2, 150); // 資源配比上限
    configSheet.setColumnWidth(3, 300); // 說明

    // 凍結標題列
    configSheet.setFrozenRows(1);

    // 加入說明文字（放在第5欄E欄，不影響資料區域）
    const noteCell = configSheet.getRange(2, 5);
    noteCell.setValue(
      "💡 說明：請在左側表格中設定任務分類及資源配比。\n" +
      "資源配比上限總和必須等於 100%。\n" +
      "您可以使用選單中的「測試工具 → 填入範例分類設定」來快速填入範例資料。"
    );
    noteCell.setFontSize(10);
    noteCell.setFontColor("#666666");
    noteCell.setFontStyle("italic");
    noteCell.setWrap(true);
    noteCell.setVerticalAlignment("top");
    configSheet.setColumnWidth(5, 350); // 說明欄寬度

    Logger.log(`已建立分類設定表：${configSheetName}`);

    return {
      success: true,
      sheetName: configSheetName,
      message: `已建立分類設定表「${configSheetName}」`,
      alreadyExists: false
    };

  } catch (e) {
    Logger.log("createEmptyCategoryConfigSheet 錯誤: " + e.message);
    return {
      success: false,
      error: "建立分類設定表失敗：" + e.message,
    };
  }
}

/**
 * 同步分類設定到所有使用者的試算表
 * 更新任務列表和工時記錄中的「任務分類」欄位下拉選單
 */
function syncCategoryConfigToUsers() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    // 讀取試算表清單
    const listSheet = ss.getSheetByName("試算表清單");
    if (!listSheet) {
      ui.alert("錯誤", "找不到「試算表清單」工作表", ui.ButtonSet.OK);
      return;
    }

    const data = listSheet.getDataRange().getValues();
    if (data.length < 2) {
      ui.alert("錯誤", "試算表清單中沒有使用者資料", ui.ButtonSet.OK);
      return;
    }

    // 找到欄位索引
    const headers = data[0];
    const userNameCol = headers.findIndex(h => h.toString().trim() === "使用者");
    const spreadsheetIdCol = headers.findIndex(h => h.toString().trim() === "試算表 ID");

    if (userNameCol === -1 || spreadsheetIdCol === -1) {
      ui.alert("錯誤", "試算表清單缺少必要欄位", ui.ButtonSet.OK);
      return;
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // 處理每個使用者
    for (let i = 1; i < data.length; i++) {
      const userName = data[i][userNameCol]?.toString().trim();
      const spreadsheetId = data[i][spreadsheetIdCol]?.toString().trim();

      if (!userName || !spreadsheetId) continue;

      try {
        // 讀取該使用者的分類設定
        const categoryConfig = getUserCategoryConfig(ss, userName);
        if (!categoryConfig.success || categoryConfig.categories.length === 0) {
          results.push(`${userName}: 跳過（沒有分類設定）`);
          continue;
        }

        // 取得分類選項列表
        const categoryOptions = categoryConfig.categories.map(cat => cat.name);

        // 開啟使用者試算表
        const userSS = SpreadsheetApp.openById(spreadsheetId);

        // 同步到所有工作表
        const sheets = userSS.getSheets();
        let updatedSheets = 0;

        for (const sheet of sheets) {
          const sheetName = sheet.getName();

          // 跳過被保護的工作表（除了工時記錄）
          if (sheetName !== POMODORO_CONFIG.TIME_SHEET_NAME) {
            const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
            if (protections.length > 0) continue;
          }

          // 找到「任務分類」欄位
          const lastCol = sheet.getLastColumn();
          if (lastCol === 0) continue;

          const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
          const categoryColIndex = headerRow.findIndex(h =>
            h.toString().trim() === "任務分類"
          );

          if (categoryColIndex === -1) continue;

          // 設定資料驗證（下拉選單）
          const maxRows = sheet.getMaxRows();
          if (maxRows > 1) {
            const validationRange = sheet.getRange(2, categoryColIndex + 1, maxRows - 1, 1);
            const rule = SpreadsheetApp.newDataValidation()
              .requireValueInList(categoryOptions, true)
              .setAllowInvalid(false)
              .build();
            validationRange.setDataValidation(rule);
            updatedSheets++;
          }
        }

        if (updatedSheets > 0) {
          results.push(`${userName}: 成功（${updatedSheets} 張工作表）`);
          successCount++;
        } else {
          results.push(`${userName}: 沒有需要更新的工作表`);
        }

      } catch (e) {
        results.push(`${userName}: 失敗（${e.message}）`);
        failCount++;
      }
    }

    // 顯示結果
    const message = `同步完成\n\n成功: ${successCount} 位使用者\n失敗: ${failCount} 位使用者\n\n詳細結果：\n${results.join("\n")}`;
    ui.alert("同步分類設定", message, ui.ButtonSet.OK);

  } catch (e) {
    ui.alert("錯誤", "同步失敗：" + e.message, ui.ButtonSet.OK);
  }
}

/**
 * 填入範例分類設定（供測試使用）
 * 必須在分類設定表中執行，且該表尚未有資料
 */
function fillSampleCategoryConfig() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const sheetName = sheet.getName();

    // 檢查是否為分類設定表
    if (!sheetName.startsWith(POMODORO_CONFIG.CATEGORY_CONFIG_PREFIX)) {
      SpreadsheetApp.getUi().alert(
        '錯誤',
        '請在分類設定表中執行此功能。\n分類設定表的名稱格式應為：分類設定_使用者名稱',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return {
        success: false,
        error: '當前工作表不是分類設定表'
      };
    }

    // 檢查第2列第1欄是否已經有分類資料
    const firstDataCell = sheet.getRange(2, 1).getValue();
    const hasData = firstDataCell !== null && firstDataCell !== '';

    if (hasData) {
      // 已經有資料，顯示警告
      const result = SpreadsheetApp.getUi().alert(
        '警告',
        '此分類設定表已有分類資料。\n是否要清除現有資料並填入範例？',
        SpreadsheetApp.getUi().ButtonSet.YES_NO
      );

      if (result !== SpreadsheetApp.getUi().Button.YES) {
        return {
          success: false,
          error: '使用者取消操作'
        };
      }

      // 清除第2列之後的所有內容（保留標題列）
      const maxRows = sheet.getMaxRows();
      const lastCol = sheet.getLastColumn() || 3;
      if (maxRows > 1) {
        // 清除從第2列開始的所有內容（包括格式和數據）
        sheet.getRange(2, 1, maxRows - 1, lastCol).clearContent().clearFormat();
      }
    }

    const configSheet = sheet;

    // 重新設定標題列（確保格式正確）
    const headers = ["分類名稱", "資源配比上限(%)", "說明"];
    configSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // 設定標題列格式
    const headerRange = configSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#4285F4");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");

    // 建立範例資料
    const sampleData = [
      ["開發", 40, "程式開發、程式設計相關工作"],
      ["測試", 20, "測試、除錯、品質保證相關工作"],
      ["會議", 15, "各類會議、討論、協調溝通"],
      ["文檔", 15, "文件撰寫、規格書、說明文件"],
      ["其他", 10, "其他雜項工作"],
    ];

    // 寫入範例資料
    const startRow = 2;
    configSheet
      .getRange(startRow, 1, sampleData.length, sampleData[0].length)
      .setValues(sampleData);

    // 設定欄位格式
    configSheet.setColumnWidth(1, 120); // 分類名稱
    configSheet.setColumnWidth(2, 150); // 資源配比上限
    configSheet.setColumnWidth(3, 300); // 說明

    // 設定資料列格式
    const dataRange = configSheet.getRange(
      startRow,
      1,
      sampleData.length,
      sampleData[0].length
    );
    dataRange.setVerticalAlignment("middle");

    // 設定分類名稱欄位格式（粗體）
    configSheet.getRange(startRow, 1, sampleData.length, 1).setFontWeight("bold");

    // 設定資源配比欄位格式（置中、淺藍色背景、數字格式）
    const limitRange = configSheet.getRange(startRow, 2, sampleData.length, 1);
    limitRange.setHorizontalAlignment("center");
    limitRange.setBackground("#E8F0FE");
    limitRange.setNumberFormat('0.0"%"');

    // 凍結標題列
    configSheet.setFrozenRows(1);

    // 計算總和
    const total = sampleData.reduce((sum, row) => sum + row[1], 0);

    // 顯示成功訊息
    SpreadsheetApp.getUi().alert(
      '成功',
      `已成功填入範例分類設定！\n\n共 ${sampleData.length} 個範例分類，總和 = ${total}%\n\n範例分類：\n` +
      sampleData.map(row => `• ${row[0]} (${row[1]}%)`).join('\n'),
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    return {
      success: true,
      sheetName: sheetName,
      message: `已成功填入範例分類設定，共 ${sampleData.length} 個範例分類，總和 = ${total}%`,
      categoryCount: sampleData.length,
      totalLimit: total,
    };
  } catch (e) {
    Logger.log("fillSampleCategoryConfig 錯誤: " + e.message);
    SpreadsheetApp.getUi().alert(
      '錯誤',
      '填入範例分類設定失敗：' + e.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return {
      success: false,
      error: "填入範例分類設定失敗：" + e.message,
    };
  }
}

/**
 * 取得使用者的分類選項（用於 Enum）
 * @param {Spreadsheet} ss - 試算表物件
 * @param {string} userName - 使用者名稱
 * @returns {Array} 分類名稱陣列
 */
function getUserCategoryOptions(ss, userName) {
  const config = getUserCategoryConfig(ss, userName);
  if (!config.success || !config.categories) {
    return [];
  }
  return config.categories.map((cat) => cat.name);
}

// ==================== 資源統計系統 ====================

// 時間區段定義（天數）
const TIME_PERIODS = {
  "1D": 1, // 1天
  "3D": 3, // 3天
  "7D": 7, // 7天
  "15D": 15, // 15天
  "30D": 30, // 30天
  "90D": 90, // 90天
  "6M": 180, // 半年（約180天，實際使用日曆半年）
};

// 權重配置（越長期權重越高，半年絕對遵守）
const PERIOD_WEIGHTS = {
  "1D": 1, // 允許短期波動
  "3D": 2,
  "7D": 4,
  "15D": 8,
  "30D": 16,
  "90D": 32,
  "6M": 1000, // 半年權重極高，絕對遵守
};

/**
 * 取得當前所屬的日曆半年區間
 * @param {Date} date - 日期
 * @returns {Object} { year, half: 1|2, startDate, endDate }
 */
function getCurrentHalfYear(date) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11

  if (month < 6) {
    // 1-6月 (0-5)
    return {
      year: year,
      half: 1,
      startDate: new Date(year, 0, 1), // 1/1
      endDate: new Date(year, 5, 30, 23, 59, 59), // 6/30
    };
  } else {
    // 7-12月 (6-11)
    return {
      year: year,
      half: 2,
      startDate: new Date(year, 6, 1), // 7/1
      endDate: new Date(year, 11, 31, 23, 59, 59), // 12/31
    };
  }
}

/**
 * 計算指定時間區段內各分類的資源使用情況
 * @param {Sheet} timeSheet - 工時記錄表
 * @param {Date} startDate - 起始日期
 * @param {Date} endDate - 結束日期
 * @returns {Object} { categoryName: totalHours }
 */
function getCategoryUsageInPeriod(timeSheet, startDate, endDate) {
  const data = timeSheet.getDataRange().getValues();
  const categoryUsage = {};

  // 找出欄位索引
  const headers = data[0];
  const dateColIndex = headers.findIndex((h) => h.toString().trim() === "日期");
  const timeColIndex = headers.findIndex((h) => h.toString().trim() === "用時");
  const categoryColIndex = headers.findIndex(
    (h) => h.toString().trim() === "任務分類"
  );

  if (dateColIndex === -1 || timeColIndex === -1) {
    Logger.log("工時記錄表缺少必要欄位");
    return categoryUsage;
  }

  // 格式化日期以便比較
  const startDateStr = Utilities.formatDate(
    startDate,
    "Asia/Taipei",
    "yyyy-MM-dd"
  );
  const endDateStr = Utilities.formatDate(endDate, "Asia/Taipei", "yyyy-MM-dd");

  // 統計各分類的用時
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    let rowDate = row[dateColIndex];

    // 處理日期格式
    if (rowDate instanceof Date) {
      rowDate = Utilities.formatDate(rowDate, "Asia/Taipei", "yyyy-MM-dd");
    } else {
      rowDate = rowDate.toString().trim();
    }

    // 檢查日期是否在區間內
    if (rowDate >= startDateStr && rowDate <= endDateStr) {
      const timeUsed = parseFloat(row[timeColIndex]) || 0;
      const category =
        categoryColIndex !== -1 ? row[categoryColIndex]?.toString().trim() : "";

      if (category) {
        categoryUsage[category] = (categoryUsage[category] || 0) + timeUsed;
      }
    }
  }

  return categoryUsage;
}

/**
 * 計算多時間區段的資源使用情況
 * @param {Spreadsheet} ss - 試算表物件
 * @param {string} userName - 使用者名稱
 * @returns {Object} 資源統計結果
 */
function calculateCategoryResourceStats(ss, userName) {
  try {
    const timeSheet = ss.getSheetByName(POMODORO_CONFIG.TIME_SHEET_NAME);
    if (!timeSheet) {
      return {
        success: false,
        error: "找不到工時記錄表",
      };
    }

    // 取得分類配置（從主試算表讀取）
    const scriptProps = PropertiesService.getScriptProperties();
    const mainSSId = scriptProps.getProperty("mainSpreadsheetId");
    if (!mainSSId) {
      return {
        success: false,
        error: "找不到主試算表 ID",
      };
    }

    const mainSS = SpreadsheetApp.openById(mainSSId);
    const categoryConfig = getUserCategoryConfig(mainSS, userName);
    if (!categoryConfig.success) {
      return {
        success: false,
        error: categoryConfig.error,
      };
    }

    const today = new Date();
    const periods = {};

    // 計算各時間區段的資源使用
    for (const [periodKey, days] of Object.entries(TIME_PERIODS)) {
      if (periodKey === "6M") {
        // 半年使用日曆半年
        const halfYear = getCurrentHalfYear(today);
        const usage = getCategoryUsageInPeriod(
          timeSheet,
          halfYear.startDate,
          halfYear.endDate
        );

        // 計算總用時
        let totalTime = 0;
        for (const time of Object.values(usage)) {
          totalTime += time;
        }

        // 計算各分類的百分比
        const categories = {};
        for (const [cat, time] of Object.entries(usage)) {
          categories[cat] = {
            totalHours: Math.round(time * 100) / 100,
            percentage:
              totalTime > 0 ? Math.round((time / totalTime) * 10000) / 100 : 0,
          };
        }

        periods[periodKey] = {
          categories: categories,
          total: Math.round(totalTime * 100) / 100,
          startDate: halfYear.startDate,
          endDate: halfYear.endDate,
        };
      } else {
        // 其他時間區段使用固定天數
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - days + 1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);

        const usage = getCategoryUsageInPeriod(timeSheet, startDate, endDate);

        // 計算總用時
        let totalTime = 0;
        for (const time of Object.values(usage)) {
          totalTime += time;
        }

        // 計算各分類的百分比
        const categories = {};
        for (const [cat, time] of Object.entries(usage)) {
          categories[cat] = {
            totalHours: Math.round(time * 100) / 100,
            percentage:
              totalTime > 0 ? Math.round((time / totalTime) * 10000) / 100 : 0,
          };
        }

        periods[periodKey] = {
          categories: categories,
          total: Math.round(totalTime * 100) / 100,
          startDate: startDate,
          endDate: endDate,
        };
      }
    }

    // 計算各分類的資源配比狀態
    const categoryLimits = {};
    for (const cat of categoryConfig.categories) {
      const halfYearData = periods["6M"].categories[cat.name];
      const used6M = halfYearData ? halfYearData.percentage : 0;
      const warning = used6M >= cat.limit; // 半年超標警告

      categoryLimits[cat.name] = {
        limit: cat.limit,
        used6M: used6M,
        warning: warning,
        remaining6M: cat.limit - used6M,
      };
    }

    return {
      success: true,
      periods: periods,
      categoryLimits: categoryLimits,
    };
  } catch (e) {
    Logger.log("calculateCategoryResourceStats 錯誤: " + e.message);
    return {
      success: false,
      error: e.message,
    };
  }
}

// ==================== 任務排序演算法 ====================

/**
 * 計算任務的推薦權重分數（越高越優先）
 * @param {Object} task - 任務物件
 * @param {Object} resourceStats - 資源統計
 * @returns {number} 權重分數
 */
function calculateTaskPriorityScore(task, resourceStats) {
  const category = task.category;

  if (!category || !resourceStats.categoryLimits[category]) {
    return 0; // 沒有分類或分類不存在，分數為 0
  }

  const categoryLimit = resourceStats.categoryLimits[category];
  let score = 0;

  // 1. 半年資源剩餘比例（最重要，權重 1000）
  const halfYearRemaining = categoryLimit.remaining6M;
  score += halfYearRemaining * PERIOD_WEIGHTS["6M"];

  // 2. 各時間區段的剩餘資源（加權平均）
  for (const [period, weight] of Object.entries(PERIOD_WEIGHTS)) {
    if (period === "6M") continue; // 已單獨處理

    const periodData = resourceStats.periods[period];
    if (periodData && periodData.categories[category]) {
      const usedInPeriod = periodData.categories[category].percentage;
      const remaining = categoryLimit.limit - usedInPeriod;
      score += remaining * weight;
    } else {
      // 該時間區段沒有使用記錄，給予滿分獎勵
      score += categoryLimit.limit * weight;
    }
  }

  // 3. 如果半年已超標，大幅降低分數（但不是完全排除）
  if (categoryLimit.warning) {
    score -= 10000; // 懲罰分數
  }

  // 4. 原有的優先順序加成
  if (task.priority) {
    const priorityBonus = {
      高: 100,
      中: 50,
      低: 0,
    };
    score += priorityBonus[task.priority] || 0;
  }

  return Math.round(score);
}

/**
 * 檢查指定日期是否為假日
 * 使用台灣行事曆 API 判斷
 * @param {Date} date - 要檢查的日期
 * @returns {boolean} 是否為假日
 */
function isHoliday(date) {
  try {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 月份從 0 開始
    const day = date.getDate();

    const apiUrl = `https://api.pin-yi.me/taiwan-calendar/${year}/${month}/${day}`;

    const response = UrlFetchApp.fetch(apiUrl, {
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      // API 返回的 isHoliday 欄位表示是否為假日
      return data.isHoliday === true;
    }

    // API 失敗時，fallback 到基本判斷
    Logger.log(`台灣行事曆 API 失敗: ${response.getResponseCode()}`);
    return fallbackIsHoliday(date);
  } catch (e) {
    Logger.log(`isHoliday 錯誤: ${e.message}`);
    // 發生錯誤時，fallback 到基本判斷
    return fallbackIsHoliday(date);
  }
}

/**
 * 備用假日判斷（當 API 失敗時使用）
 * @param {Date} date - 要檢查的日期
 * @returns {boolean} 是否為假日
 */
function fallbackIsHoliday(date) {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * 取得待處理的任務清單（供番茄鐘選擇）
 * 此函數可擴展以支援更多篩選邏輯
 * @param {SpreadsheetApp.Spreadsheet} ss - 試算表物件
 * @returns {Array} 任務清單 [{id, name, status, priority}]
 */
function getPendingTasks(ss) {
  // 找到當前的任務工作表（非工時記錄）
  const sheets = ss.getSheets();
  let taskSheet = null;

  for (let i = sheets.length - 1; i >= 0; i--) {
    const sheet = sheets[i];
    const sheetName = sheet.getName();
    // 跳過工時記錄和隱藏的工作表
    if (
      sheetName !== POMODORO_CONFIG.TIME_SHEET_NAME &&
      !sheet.isSheetHidden()
    ) {
      taskSheet = sheet;
      break;
    }
  }

  if (!taskSheet) {
    return [];
  }

  const data = taskSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return [];
  }

  // 找到欄位索引
  const headers = data[0];
  const idColIndex = headers.findIndex(
    (h) => h.toString().trim() === "任務序號"
  );
  const nameColIndex = headers.findIndex(
    (h) => h.toString().trim() === "任務名稱"
  );
  const categoryColIndex = headers.findIndex(
    (h) => h.toString().trim() === "任務分類"
  );
  const statusColIndex = headers.findIndex(
    (h) => h.toString().trim() === "任務狀態"
  );
  const priorityColIndex = headers.findIndex(
    (h) => h.toString().trim() === "優先順序"
  );

  if (nameColIndex === -1 || statusColIndex === -1) {
    return [];
  }

  // 收集待處理的任務
  const tasks = [];
  const pendingStatuses = ["待處理", "進行中"];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = row[nameColIndex]?.toString().trim();
    const status = row[statusColIndex]?.toString().trim();
    const category =
      categoryColIndex !== -1 ? row[categoryColIndex]?.toString().trim() : "";

    if (name && pendingStatuses.includes(status)) {
      tasks.push({
        id: idColIndex !== -1 ? row[idColIndex] : i,
        name: name,
        category: category,
        status: status,
        priority: priorityColIndex !== -1 ? row[priorityColIndex] : "",
        rowIndex: i + 1, // 1-indexed for sheet
      });
    }
  }

  // 智能排序：根據資源配比計算權重分數
  try {
    const userName = getCurrentUserName(ss);
    Logger.log("=== 智能排序開始 ===");
    Logger.log("使用者名稱: " + userName);

    const resourceStats = calculateCategoryResourceStats(ss, userName);
    Logger.log("resourceStats.success: " + resourceStats.success);

    if (!resourceStats.success) {
      Logger.log("resourceStats.error: " + resourceStats.error);
    }

    if (resourceStats.success) {
      Logger.log("categoryLimits: " + JSON.stringify(resourceStats.categoryLimits));

      // 為每個任務計算權重分數
      tasks.forEach((task) => {
        task.priorityScore = calculateTaskPriorityScore(task, resourceStats);
        const categoryLimit = resourceStats.categoryLimits[task.category];
        task.categoryWarning = categoryLimit?.warning || false;

        Logger.log(`任務 "${task.name}": 分類="${task.category}", warning=${task.categoryWarning}, limit=${categoryLimit?.limit}, used6M=${categoryLimit?.used6M}`);
      });

      // 按權重分數排序（降序）
      tasks.sort((a, b) => b.priorityScore - a.priorityScore);

      Logger.log(`已按資源配比排序 ${tasks.length} 個任務`);
    }
    Logger.log("=== 智能排序結束 ===");
  } catch (e) {
    Logger.log("智能排序失敗，使用預設順序: " + e.message);
    Logger.log("錯誤堆疊: " + e.stack);
  }

  return tasks;
}

/**
 * 取得或建立工時記錄工作表
 * @param {SpreadsheetApp.Spreadsheet} ss - 試算表物件
 * @returns {SpreadsheetApp.Sheet} 工時記錄工作表
 */
function getOrCreateTimeSheet(ss) {
  let timeSheet = ss.getSheetByName(POMODORO_CONFIG.TIME_SHEET_NAME);

  if (!timeSheet) {
    // 取得配色方案
    let colorScheme;
    try {
      const props = PropertiesService.getDocumentProperties();
      const savedScheme = props.getProperty("colorScheme_" + ss.getId());
      colorScheme = savedScheme
        ? JSON.parse(savedScheme)
        : generateColorScheme("#4285F4");
    } catch (e) {
      colorScheme = generateColorScheme("#4285F4");
    }

    // 建立工時記錄工作表
    timeSheet = ss.insertSheet(POMODORO_CONFIG.TIME_SHEET_NAME);

    // 設定標題（加入任務分類欄位）
    const headers = ["日期", "用時", "任務名稱", "任務分類", "備註"];
    const headerRange = timeSheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // 格式化標題列（使用配色方案）
    headerRange
      .setBackground(colorScheme.headerBg)
      .setFontColor(colorScheme.headerText)
      .setFontWeight("bold")
      .setHorizontalAlignment("center");

    // 設定欄寬
    timeSheet.setColumnWidth(1, 100); // 日期
    timeSheet.setColumnWidth(2, 60); // 用時
    timeSheet.setColumnWidth(3, 200); // 任務名稱
    timeSheet.setColumnWidth(4, 100); // 任務分類
    timeSheet.setColumnWidth(5, 150); // 備註

    // 凍結標題列
    timeSheet.setFrozenRows(1);

    Logger.log("已建立工時記錄工作表");
  }

  return timeSheet;
}

/**
 * 初始化工時記錄表（確保工作表存在）
 * @param {SpreadsheetApp.Spreadsheet} ss - 試算表物件
 * @returns {Object} {success: boolean, isHoliday: boolean, message: string}
 */
function initializeTodayTimeRecords(ss) {
  const today = new Date();
  const dateStr = Utilities.formatDate(today, "Asia/Taipei", "yyyy-MM-dd");

  // 檢查是否為假日（僅用於 UI 標記）
  const holidayFlag = isHoliday(today);

  // 確保工時記錄表存在
  getOrCreateTimeSheet(ss);

  return {
    success: true,
    isHoliday: holidayFlag,
    message: `工時記錄表已準備就緒`,
  };
}

/**
 * 取得使用者的番茄鐘工作時間設定
 * @returns {number} 工作時間（分鐘）
 */
function getUserWorkDuration() {
  try {
    const props = PropertiesService.getUserProperties();
    const userDuration = props.getProperty("pomodoroWorkDuration");

    if (userDuration) {
      const duration = parseInt(userDuration);
      // 驗證範圍
      if (
        duration >= POMODORO_CONFIG.MIN_WORK_DURATION &&
        duration <= POMODORO_CONFIG.MAX_WORK_DURATION
      ) {
        return duration;
      }
    }

    // 如果沒有設定或超出範圍，返回預設值
    return POMODORO_CONFIG.DEFAULT_WORK_DURATION;
  } catch (e) {
    Logger.log("getUserWorkDuration 錯誤: " + e.message);
    return POMODORO_CONFIG.DEFAULT_WORK_DURATION;
  }
}

/**
 * 儲存使用者的番茄鐘工作時間設定
 * @param {number} duration - 工作時間（分鐘）
 * @returns {Object} 結果物件 {success: boolean, error?: string, workDuration?: number}
 */
function saveUserWorkDuration(duration) {
  try {
    // 驗證輸入
    const numDuration = parseInt(duration);

    if (isNaN(numDuration)) {
      return {
        success: false,
        error: "請輸入有效的數字",
      };
    }

    if (numDuration < POMODORO_CONFIG.MIN_WORK_DURATION) {
      return {
        success: false,
        error: `工作時間不能少於 ${POMODORO_CONFIG.MIN_WORK_DURATION} 分鐘`,
      };
    }

    if (numDuration > POMODORO_CONFIG.MAX_WORK_DURATION) {
      return {
        success: false,
        error: `工作時間不能超過 ${POMODORO_CONFIG.MAX_WORK_DURATION} 分鐘`,
      };
    }

    // 儲存設定
    const props = PropertiesService.getUserProperties();
    props.setProperty("pomodoroWorkDuration", numDuration.toString());

    Logger.log(`已儲存使用者番茄鐘設定: ${numDuration} 分鐘`);

    return {
      success: true,
      workDuration: numDuration,
    };
  } catch (e) {
    Logger.log("saveUserWorkDuration 錯誤: " + e.message);
    return {
      success: false,
      error: e.message,
    };
  }
}

/**
 * 取得番茄鐘頁面所需的資料
 * @returns {Object} 包含任務清單和今日狀態的資料
 */
function getPomodoroData() {
  try {
    Logger.log("=== getPomodoroData 開始 ===");
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 初始化今日工時記錄
    const initResult = initializeTodayTimeRecords(ss);
    Logger.log("initResult.isHoliday: " + initResult.isHoliday);

    // 取得待處理任務
    const tasks = getPendingTasks(ss);

    // 取得今日已完成的用時統計
    const timeSheet = getOrCreateTimeSheet(ss);
    const today = new Date();
    const dateStr = Utilities.formatDate(today, "Asia/Taipei", "yyyy-MM-dd");

    const data = timeSheet.getDataRange().getValues();
    let totalTimeUsed = 0;
    let recordCount = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      let rowDate = row[0];
      if (rowDate instanceof Date) {
        rowDate = Utilities.formatDate(rowDate, "Asia/Taipei", "yyyy-MM-dd");
      }

      if (rowDate === dateStr) {
        recordCount++;
        // 用時在第二欄
        const timeUsed = parseFloat(row[1]) || 0;
        totalTimeUsed += timeUsed;
      }
    }

    // 取得使用者的工作時間設定
    const workDuration = getUserWorkDuration();

    // 取得使用者名稱和資源統計
    const userName = getCurrentUserName(ss);
    Logger.log("userName: " + userName);
    const resourceStats = calculateCategoryResourceStats(ss, userName);
    Logger.log("resourceStats.success: " + resourceStats.success);

    // 處理 resourceStats，將 Date 轉成字串避免序列化問題
    let processedResourceStats = null;
    if (resourceStats.success) {
      const processedPeriods = {};
      for (const [key, period] of Object.entries(resourceStats.periods)) {
        processedPeriods[key] = {
          categories: period.categories,
          total: period.total,
          startDate: period.startDate instanceof Date
            ? Utilities.formatDate(period.startDate, "Asia/Taipei", "yyyy-MM-dd")
            : period.startDate,
          endDate: period.endDate instanceof Date
            ? Utilities.formatDate(period.endDate, "Asia/Taipei", "yyyy-MM-dd")
            : period.endDate,
        };
      }
      processedResourceStats = {
        periods: processedPeriods,
        categoryLimits: resourceStats.categoryLimits,
      };
    }

    const result = {
      success: true,
      isHoliday: initResult.isHoliday,
      tasks: tasks,
      todayStats: {
        date: dateStr,
        totalTimeUsed: Math.round(totalTimeUsed * 100) / 100, // 保留兩位小數
        recordCount: recordCount,
      },
      config: {
        workDuration: workDuration,
        minWorkDuration: POMODORO_CONFIG.MIN_WORK_DURATION,
        maxWorkDuration: POMODORO_CONFIG.MAX_WORK_DURATION,
        defaultWorkDuration: POMODORO_CONFIG.DEFAULT_WORK_DURATION,
      },
      resourceStats: processedResourceStats,
    };

    Logger.log("=== getPomodoroData 完成，回傳結果 ===");
    Logger.log("tasks 數量: " + (tasks ? tasks.length : 0));
    return result;
  } catch (e) {
    Logger.log("getPomodoroData 錯誤: " + e.message);
    Logger.log("錯誤堆疊: " + e.stack);
    return {
      success: false,
      error: e.message,
    };
  }
}

/**
 * 記錄番茄鐘完成
 * @param {string} taskName - 任務名稱
 * @param {string} taskCategory - 任務分類
 * @param {number} timeUsed - 實際用時比例（0-1，已進位到小數點後兩位）
 * @returns {Object} 結果物件
 */
function recordPomodoroCompletion(taskName, taskCategory, timeUsed) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const timeSheet = getOrCreateTimeSheet(ss);

    const today = new Date();
    const dateStr = Utilities.formatDate(today, "Asia/Taipei", "yyyy-MM-dd");

    // 取得配色方案
    let colorScheme;
    try {
      const props = PropertiesService.getDocumentProperties();
      const savedScheme = props.getProperty("colorScheme_" + ss.getId());
      colorScheme = savedScheme
        ? JSON.parse(savedScheme)
        : generateColorScheme("#4285F4");
    } catch (e) {
      colorScheme = generateColorScheme("#4285F4");
    }

    // 新增一筆記錄（加入任務分類欄位）
    const lastRow = timeSheet.getLastRow();
    const newRow = [
      dateStr, // 日期
      timeUsed, // 用時
      taskName, // 任務名稱
      taskCategory || "", // 任務分類
      "", // 備註
    ];

    const rowRange = timeSheet.getRange(lastRow + 1, 1, 1, newRow.length);
    rowRange.setValues([newRow]);

    // 設定日期格式
    timeSheet.getRange(lastRow + 1, 1).setNumberFormat("yyyy-mm-dd");

    // 設定用時格式（小數點後兩位）
    timeSheet.getRange(lastRow + 1, 2).setNumberFormat("0.00");

    // 設定資料列背景色（使用配色方案）
    rowRange.setBackground(colorScheme.dataBg);
    rowRange.setFontColor(colorScheme.dataText);

    Logger.log(
      `已記錄番茄鐘: ${taskName} [${taskCategory}] (用時 ${timeUsed})`
    );

    return {
      success: true,
      timeUsed: timeUsed,
      message: `已記錄用時 ${timeUsed}`,
    };
  } catch (e) {
    Logger.log("recordPomodoroCompletion 錯誤: " + e.message);
    return {
      success: false,
      error: e.message,
    };
  }
}

/**
 * 儲存番茄鐘計時器狀態
 * @param {Object} state - 計時器狀態物件
 * @returns {Object} 結果物件
 */
function savePomodoroState(state) {
  try {
    const userProps = PropertiesService.getUserProperties();
    userProps.setProperty("pomodoroState", JSON.stringify(state));
    return { success: true };
  } catch (e) {
    Logger.log("savePomodoroState 錯誤: " + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 載入番茄鐘計時器狀態
 * @returns {Object} 計時器狀態物件
 */
function loadPomodoroState() {
  try {
    const userProps = PropertiesService.getUserProperties();
    const stateStr = userProps.getProperty("pomodoroState");

    if (!stateStr) {
      return { success: true, state: null };
    }

    const state = JSON.parse(stateStr);

    // 檢查狀態是否過期（超過一天）
    if (state && state.savedAt) {
      const savedDate = new Date(state.savedAt);
      const now = new Date();
      const diffHours = (now - savedDate) / (1000 * 60 * 60);

      // 如果超過 24 小時，清除狀態
      if (diffHours > 24) {
        userProps.deleteProperty("pomodoroState");
        return { success: true, state: null };
      }
    }

    return { success: true, state: state };
  } catch (e) {
    Logger.log("loadPomodoroState 錯誤: " + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 清除番茄鐘計時器狀態
 * @returns {Object} 結果物件
 */
function clearPomodoroState() {
  try {
    const userProps = PropertiesService.getUserProperties();
    userProps.deleteProperty("pomodoroState");
    return { success: true };
  } catch (e) {
    Logger.log("clearPomodoroState 錯誤: " + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 顯示番茄鐘 Sidebar
 */
function showPomodoroSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("PomodoroTimer")
    .setTitle("番茄鐘")
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * 【測試用】清除所有使用者資料
 * 包括：
 * - 刪除所有使用者試算表
 * - 刪除主試算表中的分類設定表
 * - 清除試算表清單
 * - 刪除相關觸發器
 */
function cleanupAllUserData() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 確認操作
  const response = ui.alert(
    "⚠️ 警告",
    "此操作將刪除：\n" +
    "• 所有使用者試算表\n" +
    "• 所有分類設定表\n" +
    "• 試算表清單中的所有記錄\n" +
    "• 相關觸發器\n\n" +
    "此操作無法復原！確定要繼續嗎？",
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert("已取消", "操作已取消", ui.ButtonSet.OK);
    return;
  }

  try {
    const results = {
      deletedSpreadsheets: 0,
      failedSpreadsheets: [],
      deletedConfigSheets: 0,
      deletedTriggers: 0,
      errors: []
    };

    // 1. 讀取試算表清單
    const listSheet = ss.getSheetByName("試算表清單");
    if (!listSheet) {
      ui.alert("提示", "找不到「試算表清單」工作表，沒有需要清理的資料", ui.ButtonSet.OK);
      return;
    }

    const data = listSheet.getDataRange().getValues();
    if (data.length < 2) {
      ui.alert("提示", "試算表清單中沒有使用者資料", ui.ButtonSet.OK);
      return;
    }

    // 找到欄位索引
    const headers = data[0];
    const userNameCol = headers.findIndex(h => h.toString().trim() === "使用者");
    const spreadsheetIdCol = headers.findIndex(h => h.toString().trim() === "試算表 ID");

    if (userNameCol === -1 || spreadsheetIdCol === -1) {
      ui.alert("錯誤", "試算表清單缺少必要欄位（使用者、試算表 ID）", ui.ButtonSet.OK);
      return;
    }

    // 2. 刪除所有使用者觸發器
    const existingTriggers = ScriptApp.getProjectTriggers();
    existingTriggers.forEach(trigger => {
      const handlerFunction = trigger.getHandlerFunction();
      if (handlerFunction === "onOpenUserSpreadsheet" ||
          handlerFunction === "onChangeUserSpreadsheet" ||
          handlerFunction === "onEditUserSpreadsheet") {
        ScriptApp.deleteTrigger(trigger);
        results.deletedTriggers++;
      }
    });

    // 3. 收集使用者名稱和試算表 ID
    const users = [];
    for (let i = 1; i < data.length; i++) {
      const userName = data[i][userNameCol]?.toString().trim();
      const spreadsheetId = data[i][spreadsheetIdCol]?.toString().trim();
      if (userName && spreadsheetId) {
        users.push({ userName, spreadsheetId });
      }
    }

    // 4. 刪除使用者試算表
    for (const user of users) {
      try {
        // 嘗試刪除試算表（移到垃圾桶）
        const file = DriveApp.getFileById(user.spreadsheetId);
        file.setTrashed(true);
        results.deletedSpreadsheets++;
        Logger.log(`已刪除使用者試算表: ${user.userName} (${user.spreadsheetId})`);
      } catch (e) {
        results.failedSpreadsheets.push(`${user.userName}: ${e.message}`);
        Logger.log(`刪除試算表失敗: ${user.userName} - ${e.message}`);
      }
    }

    // 5. 刪除主試算表中的分類設定表
    const allSheets = ss.getSheets();
    for (const sheet of allSheets) {
      const sheetName = sheet.getName();
      if (sheetName.startsWith("分類設定_")) {
        try {
          ss.deleteSheet(sheet);
          results.deletedConfigSheets++;
          Logger.log(`已刪除分類設定表: ${sheetName}`);
        } catch (e) {
          results.errors.push(`刪除 ${sheetName} 失敗: ${e.message}`);
        }
      }
    }

    // 6. 清除試算表清單（保留標題列）
    if (data.length > 1) {
      listSheet.deleteRows(2, data.length - 1);
      Logger.log("已清除試算表清單");
    }

    // 7. 顯示結果
    let message = "清理完成！\n\n";
    message += `✓ 已刪除 ${results.deletedSpreadsheets} 個使用者試算表\n`;
    message += `✓ 已刪除 ${results.deletedConfigSheets} 個分類設定表\n`;
    message += `✓ 已刪除 ${results.deletedTriggers} 個觸發器\n`;
    message += `✓ 已清除試算表清單\n`;

    if (results.failedSpreadsheets.length > 0) {
      message += `\n⚠️ 刪除失敗的試算表：\n${results.failedSpreadsheets.join("\n")}`;
    }

    if (results.errors.length > 0) {
      message += `\n⚠️ 其他錯誤：\n${results.errors.join("\n")}`;
    }

    ui.alert("清理結果", message, ui.ButtonSet.OK);

  } catch (e) {
    ui.alert("錯誤", "清理過程發生錯誤：" + e.message, ui.ButtonSet.OK);
    Logger.log("cleanupAllUserData 錯誤: " + e.stack);
  }
}
