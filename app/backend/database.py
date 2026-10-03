"""
Database Manager for BD-NURSE (BK-GS-ĐD.01)
Quản lý kết nối SQLite WAL mode ngoài Google Drive & cơ chế sao lưu snapshot an toàn.
"""

import os
import sqlite3
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

# Vị trí Database thực tế NGOÀI Google Drive
DB_DIR = Path.home() / "QualityAuditData"
DB_PATH = DB_DIR / "quality_audit.db"

# Vị trí thư mục Backup trong Google Drive
BACKUP_DIR = Path(os.environ.get("BACKUP_DIR", Path(__file__).resolve().parent.parent.parent / "data" / "backup"))
MAX_BACKUP_FILES = 30


def get_connection() -> sqlite3.Connection:
    """Tạo kết nối SQLite với cấu hình WAL mode và Foreign Keys."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def backup_database() -> str:
    """
    Sao lưu cơ sở dữ liệu an toàn bằng sqlite3 API (không copy file khi WAL đang mở).
    Giữ tối đa MAX_BACKUP_FILES bản sao lưu gần nhất.
    """
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"quality_audit_backup_{timestamp}.db"

    src_conn = get_connection()
    try:
        dst_conn = sqlite3.connect(str(backup_file))
        try:
            src_conn.backup(dst_conn)
        finally:
            dst_conn.close()
    finally:
        src_conn.close()

    # Dọn dẹp bản sao lưu cũ, chỉ giữ MAX_BACKUP_FILES bản mới nhất
    try:
        backup_files = sorted(
            [f for f in BACKUP_DIR.glob("quality_audit_backup_*.db")],
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )
        if len(backup_files) > MAX_BACKUP_FILES:
            for old_file in backup_files[MAX_BACKUP_FILES:]:
                old_file.unlink()
    except Exception as e:
        print(f"[Warning] Không thể dọn dẹp backup cũ: {e}")

    return str(backup_file)


def init_db():
    """Khởi tạo schema cơ sở dữ liệu nếu chưa tồn tại."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Bảng danh mục khoa (departments)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        block VARCHAR(100) NOT NULL,
        default_head_nurse VARCHAR(255) DEFAULT '',
        kap_preset_json TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Bảng 63 dòng tiêu chuẩn con (criteria)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS criteria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chang VARCHAR(10) NOT NULL,
        muc_stt INTEGER NOT NULL,
        muc_ten VARCHAR(255) NOT NULL,
        noi_dung TEXT NOT NULL,
        diem INTEGER NOT NULL,
        thu_tu INTEGER NOT NULL,
        template_row INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Bảng đợt giám sát (inspection_rounds)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inspection_rounds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department_id INTEGER NOT NULL REFERENCES departments(id),
        loai_dot VARCHAR(20) DEFAULT 'DINH_KY', -- DINH_KY, DOT_XUAT, TAI_GIAM_SAT
        dot_goc_id INTEGER NULL REFERENCES inspection_rounds(id),
        quarter INTEGER NOT NULL,
        year INTEGER NOT NULL,
        inspection_time VARCHAR(100) NOT NULL, -- Định dạng dd.mm.yyyy HH:MM
        head_nurse VARCHAR(255) NOT NULL,
        inspectors TEXT NOT NULL, -- Danh sách thành viên giám sát, mỗi người 1 dòng
        total_standard_score INTEGER DEFAULT 100,
        total_kap_score INTEGER DEFAULT 0,
        total_achieved_score REAL NOT NULL,
        compliance_rate REAL NOT NULL,
        rating VARCHAR(50) NOT NULL,
        rating_code VARCHAR(20) NOT NULL,
        is_serious_violation BOOLEAN DEFAULT 0,
        serious_violation_type VARCHAR(100) NULL,
        serious_violation_desc TEXT NULL,
        han_khac_phuc VARCHAR(50) NULL, -- Hạn +48h nếu Cần cải tiến
        han_tai_giam_sat VARCHAR(50) NULL, -- Hạn +3 đến 5 ngày nếu KHÔNG ĐẠT
        trang_thai VARCHAR(20) DEFAULT 'nhap', -- nhap, hoan_tat, da_khoa
        unlock_reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
    );
    """)

    # 4. Bảng chi tiết chấm 63 dòng con (inspection_details)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inspection_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round_id INTEGER NOT NULL REFERENCES inspection_rounds(id) ON DELETE CASCADE,
        criterion_id INTEGER NOT NULL REFERENCES criteria(id),
        status VARCHAR(10) NOT NULL, -- ACHIEVED, FAILED, NA
        awarded_score REAL NOT NULL,
        defect_note TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 5. Bảng kế hoạch khắc phục (corrective_plans)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS corrective_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round_id INTEGER NOT NULL REFERENCES inspection_rounds(id) ON DELETE CASCADE,
        deficiencies_summary TEXT DEFAULT '',
        action_measures TEXT DEFAULT '',
        person_in_charge VARCHAR(255) DEFAULT '',
        deadline VARCHAR(50) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()
    conn.close()
