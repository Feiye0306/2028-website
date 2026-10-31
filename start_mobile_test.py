import subprocess, re, time, os, sys

def main():
    print("=" * 60)
    print("   2028 學測作戰地圖 - 真實手機公網 (4G/5G) 測試環境")
    print("=" * 60)
    print("\n[1/3] 正在啟動本機安全服務 (Port 8080)...")
    
    docs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")
    cf_exe = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cloudflared.exe")
    
    # 啟動 local http server
    p_srv = subprocess.Popen([sys.executable, "-m", "http.server", "8080", "--directory", docs_dir], 
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    print("[2/3] 正在建立 Cloudflare 專屬公網安全通道 (HTTPS)...")
    p_cf = subprocess.Popen([cf_exe, "tunnel", "--url", "http://localhost:8080"], 
                            stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
    
    public_url = None
    start_time = time.time()
    
    while time.time() - start_time < 20:
        line = p_cf.stderr.readline()
        if "trycloudflare.com" in line:
            m = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
            if m:
                public_url = m.group(0)
                break
                
    if not public_url:
        print("❌ 通道建立逾時，請檢查網路連線。")
        p_cf.terminate()
        p_srv.terminate()
        return

    print("[3/3] 通道建立成功！\n")
    print("-" * 60)
    print(f"📱 真實手機專用測試網址 (免 WiFi，4G/5G 均可開啟)：")
    print(f"\n   👉  {public_url}\n")
    print("-" * 60)
    
    # 產生 QR Code 圖片連結並嘗試開啟
    qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={public_url}"
    print(f"📷 專屬 QR Code 圖片網址 (可用手機直接對著螢幕掃描)：")
    print(f"   {qr_url}\n")
    
    print("💡【家長端操作體驗三步驟】：")
    print("  1. 手機打開相機，直接掃描上方網址（或手動輸入網址）。")
    print("  2. 進入頁面後，點擊「🔔 模擬每週四推播通知」（或加到主畫面）。")
    print("  3. 手機系統彈出「是否允許通知？」，點擊「允許」—— 即完成訂閱並收到推播！\n")
    print("*" * 60)
    print("測試完成後，直接按 Ctrl+C 或關閉本視窗即可結束通道。")
    print("*" * 60)
    
    # 在預設瀏覽器打開 QR Code 方便手機鏡頭直接對著掃
    try:
        if sys.platform == 'win32':
            os.startfile(qr_url)
    except:
        pass
        
    try:
        p_cf.wait()
    except KeyboardInterrupt:
        pass
    finally:
        print("\n正在關閉測試伺服器與公網通道...")
        p_cf.terminate()
        p_srv.terminate()
        print("已完全關閉。")

if __name__ == "__main__":
    main()
