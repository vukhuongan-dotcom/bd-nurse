#!/usr/bin/env python3
import os
import sys
from pathlib import Path

# Thêm đường dẫn app/backend vào sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "app" / "backend"))
sys.path.insert(0, str(PROJECT_ROOT))

from database import init_db
from seed_departments import seed_departments
from seed_criteria import seed_criteria
import uvicorn

def main():
    print("[BD-NURSE Cloud Startup] Khởi tạo Database & Nạp dữ liệu nền tảng...")
    init_db()
    seed_departments()
    seed_criteria()

    port = int(os.environ.get("PORT", 8765))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"[BD-NURSE Cloud Startup] Bắt đầu máy chủ Uvicorn trên {host}:{port}...")
    uvicorn.run("app.backend.main:app", host=host, port=port)

if __name__ == "__main__":
    main()
