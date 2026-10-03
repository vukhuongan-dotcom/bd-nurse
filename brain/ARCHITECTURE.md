# KIẾN TRÚC KỸ THUẬT HỆ THỐNG (SYSTEM ARCHITECTURE)
## BD-NURSE — HỆ THỐNG GIÁM SÁT CHẤT LƯỢNG CHUYÊN MÔN ĐIỀU DƯỠNG
### BD-NURSE: Binh Dan Nursing Uniform Real-time Safety & Evaluation

---

## 1. TỔNG QUAN KIẾN TRÚC (HIGH-LEVEL ARCHITECTURE)

Hệ thống được thiết kế theo mô hình **Local-First & Offline-Ready Monolith** tối ưu cho mạng nội bộ bệnh viện:

```
[ Trình duyệt Web / iPad Safari / Chrome ]
                 │
                 │ HTTP (RESTful JSON)
                 ▼
┌────────────────────────────────────────────────────────┐
│             FastAPI Backend Application                │
│  ├── API Router (/api/departments, /api/inspections)   │
│  ├── Calculation Engine (Tỷ lệ tuân thủ, Xếp loại)     │
│  ├── SQLite Engine (WAL Mode, zero data-loss)          │
│  └── Export Engine (python-docx + AppleScript Bridge)  │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌───────────────┐               ┌───────────────────────────────┐
│ SQLite DB     │               │  DOCX & PDF Generator         │
│ (Local File)  │               │  ├── BK-GS-DD.01 Template     │
│               │               │  └── Word Container Bridge    │
└───────────────┘               └───────────────────────────────┘
```

---

## 2. CƠ SỞ DỮ LIỆU (DATABASE SCHEMA — SQLITE WAL MODE)

Cơ sở dữ liệu lưu tại: `data/quality_audit.db`

### 1. Bảng `departments` (Danh mục khoa)
* `id`: INTEGER PRIMARY KEY AUTOINCREMENT
* `code`: VARCHAR(50) UNIQUE (ví dụ: `PTDTT`, `NG_TIEUHOA`, `ICU`...)
* `name`: VARCHAR(255) NOT NULL (Tên chuẩn 27 khoa)
* `block`: VARCHAR(100) (Khối chuyên khoa: TIÊU HÓA, TIẾT NIỆU, HỒI SỨC, CẬN LÂM SÀNG...)
* `is_inpatient`: BOOLEAN DEFAULT TRUE (Có buồng bệnh nội trú hay không)
* `head_nurse_default`: VARCHAR(255) (Tên ĐD Trưởng khoa mặc định)

### 2. Bảng `inspections` (Đợt giám sát chất lượng)
* `id`: INTEGER PRIMARY KEY AUTOINCREMENT
* `department_id`: INTEGER REFERENCES departments(id)
* `quarter`: INTEGER NOT NULL (1, 2, 3, 4)
* `year`: INTEGER NOT NULL (2026, 2027...)
* `inspection_time`: VARCHAR(100) (Thời gian ghi nhận: `14:30 15.10.2026`)
* `head_nurse`: VARCHAR(255) (ĐD Trưởng khoa tại thời điểm kiểm tra)
* `inspectors`: TEXT (Danh sách thành viên đoàn giám sát, mỗi người 1 dòng)
* `total_standard_score`: INTEGER DEFAULT 100
* `total_excluded_score`: INTEGER DEFAULT 0 (Tổng điểm các mục KAP)
* `total_achieved_score`: REAL NOT NULL (Tổng điểm Đạt thực tế)
* `compliance_rate`: REAL NOT NULL (Tỷ lệ % tuân thủ)
* `rating`: VARCHAR(50) NOT NULL (Đạt, Tốt, Cần cải tiến, Không đạt)
* `is_serious_violation`: BOOLEAN DEFAULT FALSE
* `status`: VARCHAR(20) DEFAULT 'completed' ('draft', 'completed')
* `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
* `updated_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### 3. Bảng `inspection_items` (Chi tiết chấm từng tiêu chí)
* `id`: INTEGER PRIMARY KEY AUTOINCREMENT
* `inspection_id`: INTEGER REFERENCES inspections(id) ON DELETE CASCADE
* `criterion_code`: VARCHAR(50) NOT NULL (Mã tiêu chí, ví dụ: `C01_1`, `C08_2`...)
* `stage`: INTEGER NOT NULL (1 đến 5)
* `title`: VARCHAR(255) NOT NULL
* `content`: TEXT NOT NULL (Mô tả tiêu chuẩn đạt)
* `max_score`: REAL NOT NULL
* `status`: VARCHAR(20) NOT NULL ('ACHIEVED', 'FAILED', 'NA')
* `awarded_score`: REAL NOT NULL
* `defect_note`: TEXT (Ghi chú cụ thể tồn tại nếu FAILED)

### 4. Bảng `corrective_plans` (Kế hoạch hành động & Khắc phục)
* `id`: INTEGER PRIMARY KEY AUTOINCREMENT
* `inspection_id`: INTEGER REFERENCES inspections(id) ON DELETE CASCADE
* `deficiencies_summary`: TEXT (Tồn tại / Sai sót ghi nhận tại khoa)
* `action_measures`: TEXT (Biện pháp khắc phục cụ thể)
* `person_in_charge`: VARCHAR(255) (Người chịu trách nhiệm)
* `deadline`: VARCHAR(50) (Thời hạn hoàn thành dạng `dd.mm.yyyy`)

---

## 3. ENGINE TÍNH TOÁN & LOGIC NGHIỆP VỤ

### 1. Thuật toán Tính điểm & Tỷ lệ Tuân thủ
```python
def calculate_compliance(items):
    total_standard = 100.0
    total_kap = sum(item.max_score for item in items if item.status == 'NA')
    effective_standard = total_standard - total_kap
    
    total_achieved = sum(item.awarded_score for item in items if item.status == 'ACHIEVED')
    
    if effective_standard <= 0:
        rate = 0.0
    else:
        rate = round((total_achieved / effective_standard) * 100.0, 1)
        
    return total_achieved, total_kap, rate
```

### 2. Thuật toán Xếp loại Tự động
```python
def determine_rating(compliance_rate, is_serious_violation=False):
    if is_serious_violation or compliance_rate < 70.0:
        return "KHÔNG ĐẠT", "danger"
    elif 70.0 <= compliance_rate < 80.0:
        return "Cần cải tiến", "warning"
    elif 80.0 <= compliance_rate < 90.0:
        return "Tốt / Đạt yêu cầu", "info"
    else:
        return "Đạt", "success"
```

---

## 4. QUY TRÌNH XUẤT DOCX & PDF THÀNH PHẨM

```
[ Dữ liệu Chấm điểm JSON ]
           │
           ▼
[ python-docx Template Engine ]
 ├── Đọc file templates/BK-GS-DD.01_template.docx
 ├── Thay thế Header Table (Table 0): Tên khoa, Thời gian, Nhân sự
 ├── Điền Table 1: Đánh dấu [X] vào cột Đạt hoặc Không đạt + ghi defect_note
 ├── Điền chân bảng Table 1: Tổng điểm, Tỷ lệ %, Xếp loại
 ├── Điền Table 2: Danh sách Tồn tại & Kế hoạch Khắc phục
 ├── Điền Table 3: Khối chữ ký (Thành viên GS, ĐD Trưởng khoa, Trưởng P.ĐD)
 ├── Khóa layout XML: w:tcW, w:cantSplit, w:tblHeader
 └── Lưu vào: exports/docx/BK-GS-DD.01_[Khoa]_[Quy]_[Nam].docx
           │
           ▼
[ AppleScript Word Container Bridge (Zero-Prompt) ]
 ├── Copy DOCX vào ~/Library/Containers/com.microsoft.Word/Data/Documents/
 ├── Chạy AppleScript ngầm mở file và ExportAsFixedFormat sang PDF
 ├── Di chuyển file PDF thành phẩm vào: exports/pdf/
 └── Dọn dẹp thư mục Container
```
