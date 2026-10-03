# 🩺 BD-NURSE — HỆ THỐNG GIÁM SÁT CHẤT LƯỢNG CHUYÊN MÔN ĐIỀU DƯỠNG
## Binh Dan Nursing Uniform Real-time Safety & Evaluation
### Chuẩn biểu mẫu: BK-GS-ĐD.01 (Ban hành 2026, Lần BH: 02) • Bệnh viện Bình Dân

---

## 🌟 GIỚI THIỆU DỰ ÁN

**BD-NURSE** là hệ thống phần mềm chuyên dụng hỗ trợ Phòng Điều dưỡng — Bệnh viện Bình Dân trong công tác kiểm tra, giám sát chuyên môn điều dưỡng định kỳ (Quý I, II, III, IV) và đột xuất tại **27 khoa** toàn viện.

### 💡 Ý nghĩa tên viết tắt BD-NURSE:
* **B** — **B**ình Dân: Thương hiệu và văn hóa chất lượng Bệnh viện Bình Dân.
* **D** — **D**iều dưỡng: Lực lượng nòng cốt chăm sóc người bệnh 24/7.
* **N** — **N**ursing: Nghiệp vụ chuyên môn kỹ thuật điều dưỡng theo Thông tư 31/2021/TT-BYT.
* **U** — **U**niform: Bộ tiêu chuẩn giám sát thống nhất toàn diện trên 27 khoa phòng (`BK-GS-ĐD.01`).
* **R** — **R**eal-time: Chấm điểm thực địa, tính điểm và xếp loại tự động theo thời gian thực.
* **S** — **S**afety: Đặt An toàn người bệnh làm trung tâm; tích hợp cổng cưỡng chế khi xảy ra sự cố nghiêm trọng.
* **E** — **E**valuation: Lượng giá tuân thủ (PDCA), phân tích top lỗi và theo dõi hạn khắc phục.

---

## 🚀 KHỞI ĐỘNG ỨNG DỤNG (1 LỆNH DUY NHẤT)

Ứng dụng chạy trên nền tảng Python FastAPI và tự động mở trình duyệt Google Chrome theo **Rule §1.5**:

```bash
# Kích hoạt môi trường và khởi chạy
source ~/.ag-venv/bin/activate
python3 "/Users/khuonganvu/Library/CloudStorage/GoogleDrive-vukhuongan@gmail.com/Drive của tôi/KHÁC/DAO/WEB KIỂM TRA CHẤT LƯỢNG KHOA/scripts/start_app.py"
```

👉 **Đường dẫn truy cập trực tiếp:** [http://127.0.0.1:8765](http://127.0.0.1:8765)

---

## 🎯 CÁC PHÂN HỆ CHỨC NĂNG CHÍNH

### 1. Phân hệ Nhập liệu Thực địa (63 Tiêu chuẩn con)
* Đơn vị đánh giá độc lập trên **63 tiêu chuẩn con** (tương ứng hàng 4 đến 70 của Table 1, thuộc 5 chặng, tổng 100 điểm chuẩn).
* Mỗi dòng con có 3 nút bấm cảm ứng kích thước chuẩn công thái học **44×44px**:
  * 🟢 **ĐẠT:** Nhận đủ điểm chuẩn của dòng con.
  * 🔴 **K.ĐẠT:** 0 điểm, tự động mở ô nhập ghi chú sai sót.
  * ⚪ **KAP:** Không áp dụng, tự động trừ khỏi mẫu số tính điểm.
* Nút *"Đạt tất cả chặng"* và *"KAP cả chặng"* giúp tiết kiệm tối đa thời gian khi đi buồng bệnh.
* **Cổng Vi phạm An toàn NB Nghiêm trọng:** Cưỡng chế hạ xếp loại xuống **KHÔNG ĐẠT** bất kể điểm số %, hiển thị thông báo khẩn yêu cầu lập biên bản sự cố.
* **Bảo mật DLP (Data Loss Prevention):** Tự động quét và cảnh báo đỏ ngay trên giao diện nếu người dùng vô tình nhập chuỗi giống số điện thoại hoặc mã số hồ sơ bệnh án.
* **Sticky Score Bar:** Luôn hiển thị tổng điểm đạt, tỷ lệ tuân thủ (%) và huy hiệu xếp loại khi cuộn trang.
* Tự động lưu nháp (Auto-save) mỗi 30 giây vào SQLite.

### 2. Phân hệ Dashboard Quản trị & Thống kê
* Thống kê tiến độ Quý (số khoa đã kiểm tra định kỳ hoàn tất / 27 khoa).
* Biểu đồ Cột xếp hạng tỷ lệ tuân thủ của 27 khoa từ cao xuống thấp (tô màu theo 4 mức xếp loại).
* Biểu đồ Donut phân bố xếp loại chất lượng toàn viện.
* Biểu đồ Thanh ngang phân tích **Top 5 lỗi vi phạm nhiều nhất** theo tỷ lệ $\frac{\text{Số lần KĐ}}{\text{Số lần áp dụng}}$.
* Bảng theo dõi hạn khắc phục (+48 giờ đối với Cần cải tiến) và hạn tái giám sát (+3 đến 5 ngày đối với KHÔNG ĐẠT).

### 3. Phân hệ Xuất file Thành phẩm DOCX & PDF Nguyên bản
* Sử dụng cơ chế **In-place Filling Engine**: Chỉ điền dữ liệu vào đúng tọa độ của file mẫu gốc `templates/BK-GS-DD.01_template.docx`.
* Bảo toàn 100% layout, độ rộng cột, font Times New Roman, khổ giấy US Letter và mã "Lần BH: 02" của Bệnh viện Bình Dân.
* Xuất PDF ngầm tự động qua **Word Container Bridge** (`~/Library/Containers/com.microsoft.Word/Data/Documents/`), đạt chuẩn **Zero-Prompt Protocol** (100% không hiện popup xin quyền của macOS).

---

## 🔒 AN TOÀN DỮ LIỆU & BẢO MẬT

1. **Vị trí Database thực địa:** Lưu tại `~/QualityAuditData/quality_audit.db` (nằm trên ổ đĩa SSD cục bộ ngoài Google Drive để tránh xung đột file đa luồng và lỗi khóa tệp khi đang bật SQLite WAL mode).
2. **Cơ chế Snapshot Backup:** Sử dụng API `sqlite3 .backup` tạo bản sao lưu snapshot định kỳ vào thư mục Google Drive:
   `/Users/khuonganvu/Library/CloudStorage/GoogleDrive-vukhuongan@gmail.com/Drive của tôi/KHÁC/DAO/WEB KIỂM TRA CHẤT LƯỢNG KHOA/data/backup/`
   Tự động xoay vòng và lưu giữ 30 bản snapshot gần nhất.
