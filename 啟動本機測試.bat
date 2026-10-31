@echo off
chcp 65001 >nul
echo ========================================================
echo   2028 學測作戰地圖 - 本機 PWA 測試伺服器
echo ========================================================
echo.
echo [說明] PWA 與推播通知規定必須在 HTTP/HTTPS 伺服器環境下運行。
echo 正在為您啟動本機伺服器：http://localhost:8080
echo.
echo 伺服器啟動後，將自動為您開啟瀏覽器。
echo 若要結束測試，直接關閉此視窗即可。
echo.

start "" "http://localhost:8080"
python -m http.server 8080 --directory docs
pause
