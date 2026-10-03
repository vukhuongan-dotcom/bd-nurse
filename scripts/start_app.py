"""
Runner Script for BD-NURSE Application
Khởi chạy máy chủ FastAPI và tự động mở Google Chrome theo Rule 1.5.
"""

import sys
import time
import urllib.request
import subprocess
from pathlib import Path

PROJECT_ROOT = Path("/Users/khuonganvu/Library/CloudStorage/GoogleDrive-vukhuongan@gmail.com/Drive của tôi/KHÁC/DAO/WEB KIỂM TRA CHẤT LƯỢNG KHOA")
BACKEND_DIR = PROJECT_ROOT / "app" / "backend"

sys.path.insert(0, str(BACKEND_DIR))

from database import init_db
from seed_criteria import seed_criteria
from seed_departments import seed_departments

PORT = 8765
HOST = "127.0.0.1"
URL = f"http://{HOST}:{PORT}"


def main():
    print("=" * 65)
    print("🩺 KHỞI ĐỘNG HỆ THỐNG BD-NURSE (BK-GS-ĐD.01)")
    print("   Bệnh viện Bình Dân — Phòng Điều dưỡng")
    print("=" * 65)

    # 1. Khởi tạo cơ sở dữ liệu
    print("[1/3] Kiểm tra & đồng bộ cơ sở dữ liệu SQLite...")
    init_db()
    seed_criteria()
    seed_departments()

    # 2. Khởi động Uvicorn trong tiến trình nền hoặc sub-process
    print(f"[2/3] Khởi động máy chủ FastAPI tại {URL}...")

    # Chạy uvicorn server qua subprocess
    server_process = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn", "main:app",
            "--host", HOST, "--port", str(PORT),
            "--app-dir", str(BACKEND_DIR)
        ]
    )

    # Chờ server sẵn sàng (liveness check)
    max_wait = 15
    start_time = time.time()
    server_ready = False

    while time.time() - start_time < max_wait:
        try:
            with urllib.request.urlopen(f"{URL}/api/health", timeout=1) as resp:
                if resp.status == 200:
                    server_ready = True
                    break
        except Exception:
            time.sleep(0.5)

    if server_ready:
        print("[3/3] Máy chủ đã sẵn sàng trực tuyến!")
        print(f"👉 Ứng dụng: {URL}")

        # Rule 1.5: Tự động mở Google Chrome
        try:
            subprocess.run(["open", "-a", "Google Chrome", URL], check=False)
            print("🚀 Đã tự động mở ứng dụng trên Google Chrome cho BSCKII. Vũ Khương An nghiệm thu.")
        except Exception as e:
            print(f"Không thể tự động mở Chrome: {e}")

        # Chờ server chạy
        try:
            server_process.wait()
        except KeyboardInterrupt:
            print("\nĐang dừng máy chủ BD-NURSE...")
            server_process.terminate()
    else:
        print("❌ Lỗi: Máy chủ không phản hồi sau 15 giây.")
        server_process.terminate()


if __name__ == "__main__":
    main()
