# Project Custom Instructions

## Versioning & Changelog Protocol (必遵規範)

每次對此專案進行任何代碼修改、功能更新、Bug修復或樣式調整時，必須執行以下操作：

1. **版本號自動遞增**：
   - 查看 `src/App.tsx` 中的 `APP_CHANGELOG` 陣列最新的版本號 (例如 `3.0.46`)。
   - 將版本號的最後一個數字加一 (例如 `3.0.46` -> `3.0.47`)。

2. **自動寫入更新日誌 (APP_CHANGELOG)**：
   - 在 `src/App.tsx` 的 `APP_CHANGELOG` 陣列末端新增一筆日誌物件。
   - 設定 `version` 為遞增後的新版本號。
   - 設定 `date` 為當前日期 (YYYY-MM-DD)。
   - 在 `details` 陣列中簡短摘要該次修改的主要功能重點與改動細節。

3. **完成編譯與驗證**：
   - 確保更新後執行 `compile_applet` 驗證成功，無語法或類型錯誤。
