import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def run():
    sys.stdout.reconfigure(encoding='utf-8')
    web_dir = r"C:\Users\Darry\Desktop\CodeHere\2028-website"
    output_dir = r"C:\Users\Darry\Desktop\CodeHere\kanban-flow\handover\2028-website\screenshots"
    os.makedirs(output_dir, exist_ok=True)

    # 啟動 python 本機伺服器
    server_proc = subprocess.Popen([sys.executable, "-m", "http.server", "8089"], cwd=web_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="msedge", headless=True)
            
            # 1. 桌面版全頁截圖 (1440x900)
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            print("1. 導覽至 2028-website (桌面版)...")
            page.goto("http://localhost:8089/index.html")
            page.wait_for_timeout(1500)

            title = page.title()
            print(f"  頁面標題: {title}")
            assert "作戰地圖" in title, "Title does not contain 作戰地圖"

            # 驗證時間軸與小人
            timeline_count = page.locator(".timeline-step-row").count()
            print(f"  五階段時間軸節點數量: {timeline_count}")
            assert timeline_count == 5, "Timeline steps count should be 5"

            walker_count = page.locator(".walker-badge").count()
            print(f"  小人標章數量: {walker_count}")
            assert walker_count >= 1, "Walker badge should be present"

            # 驗證問答英雄卡
            faq_title = page.locator(".faq-q-title >> nth=0").text_content()
            print(f"  首題問答標題: {faq_title.strip()[:60]}...")
            assert not faq_title.strip().startswith("#"), "Question title should not contain internal #id"

            page.screenshot(path=os.path.join(output_dir, "01_strategy_roadmap_desktop.png"), full_page=True)
            print("  [01_strategy_roadmap_desktop.png 拍攝完成]")

            # 測試分頁 2：科系檢索
            page.locator("button:has-text('全台 2,178 系組官方檢索')").click()
            page.wait_for_timeout(800)
            page.fill("#dept-search-input", "醫學")
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(output_dir, "02_dept_search_results.png"))
            print("  [02_dept_search_results.png 拍攝完成]")

            # 2. 手機版全頁截圖 (390x844 iPhone 13 視口)
            mobile_page = browser.new_page(viewport={"width": 390, "height": 844})
            print("2. 導覽至 2028-website (手機版)...")
            mobile_page.goto("http://localhost:8089/index.html")
            mobile_page.wait_for_timeout(1500)
            mobile_page.screenshot(path=os.path.join(output_dir, "03_strategy_roadmap_mobile.png"), full_page=True)
            print("  [03_strategy_roadmap_mobile.png 拍攝完成]")

            browser.close()
            print("Issue #13 自動化測試與所有實機截圖全數成功！")
    finally:
        server_proc.terminate()

if __name__ == "__main__":
    run()
