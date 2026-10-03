# BỘ QUY TẮC DỰ ÁN BD-NURSE (PROJECT RULES & OPERATIONAL PROTOCOLS)
## HỆ THỐNG GIÁM SÁT CHẤT LƯỢNG CHUYÊN MÔN ĐIỀU DƯỠNG — BỆNH VIỆN BÌNH DÂN
### BD-NURSE: Binh Dan Nursing Uniform Real-time Safety & Evaluation
### Chuẩn biểu mẫu: BK-GS-ĐD.01 (Ban hành 2026, Lần 01) • Phạm vi: 27 Khoa Lâm sàng & Cận lâm sàng

> 📌 **Tuyên ngôn nguyên tắc:** Tài liệu này là **Hiến pháp Kỹ thuật & Quản trị Vận hành** bất biến của dự án **BD-NURSE**. Mọi phiên làm việc của AI Agent (Antigravity), lập trình viên và quản trị viên hệ thống **BẮT BUỘC TUÂN THỦ 100%** mà không có bất kỳ ngoại lệ nào.

---

## PHẦN I: NGUYÊN TẮC GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX PROTOCOLS)

### ĐIỀU 1: CHUẨN ĐỊNH DẠNG NGÀY THÁNG DD.MM.YYYY TOÀN BỘ HỆ THỐNG (DATE FORMAT PROTOCOL)
> 🛑 **Mệnh lệnh từ BSCKII. Vũ Khương An:**  
> *"Định dạng ngày tháng luôn dùng `dd.mm.yyyy` cho toàn bộ website. Lưu điều này vào hệ thống AG để thực hiện cho tất cả các dự án."*

1. **Chuẩn hóa duy nhất `dd.mm.yyyy`:**
   - Toàn bộ các trường hiển thị ngày tháng, bộ chọn ngày (Date Picker), danh sách đợt giám sát, widget thời gian thực, bảng lịch sử và tệp xuất báo cáo **BẮT BUỘC** hiển thị theo định dạng `dd.mm.yyyy` (dùng dấu chấm làm dấu phân cách, 2 chữ số ngày, 2 chữ số tháng, 4 chữ số năm, ví dụ: `15.10.2026`).
   - Tuyệt đối **không** dùng `yyyy-mm-dd`, `mm/dd/yyyy` hoặc `dd/mm/yyyy` trên giao diện người dùng.

### ĐIỀU 2: NGUYÊN TẮC LUÔN TỰ ĐỘNG MỞ GOOGLE CHROME & DẪN LINK BẤM ĐƯỢC (RULE 1.5 AUTO-OPEN PROTOCOL)
1. **Tự động mở trực tiếp trên Google Chrome:**
   - Ngay sau khi khởi chạy dev server hoặc hoàn tất cập nhật tính năng, AG **BẮT BUỘC** tự động chạy lệnh mở ứng dụng trên Google Chrome (`open -a "Google Chrome" http://localhost:8765`) để Bác sĩ và Điều dưỡng có thể kiểm thử và tương tác trực quan ngay lập tức.
2. **Kèm theo đường link trực tiếp trong chat:**
   - Luôn đính kèm đường link Markdown có thể bấm được (ví dụ: `👉 [http://localhost:8765](http://localhost:8765)`) trong phản hồi.

### ĐIỀU 3: CÔNG THÁI HỌC LÂM SÀNG & AN TOÀN DỮ LIỆU Y TẾ (MED-WEB STANDARD V2.0)
1. **Nguyên tắc Zero-Local-PHI (Bảo vệ thông tin người bệnh):**
   - Tuyệt đối **không** lưu trữ bất kỳ thông tin nhận diện người bệnh (Họ tên, SĐT, Số hồ sơ bệnh án) vào `localStorage` hay `sessionStorage`.
   - Các ghi chú vi phạm chỉ ghi nhận hành vi quy trình (ví dụ: *Chưa dán nhãn dịch truyền tại buồng 12*, *Hồ sơ chưa ký số MEWS ca trực ngày hôm qua*).
2. **Công thái học Tablet/iPad Đi buồng:**
   - Kích thước vùng bấm cảm ứng (Touch Target) của các nút chọn Đạt / Không đạt / KAP tối thiểu **44×44px** để thao tác 1 chạm chính xác khi đi thực địa buồng bệnh.
   - Bố cục chống tràn ngang 100% (`min-width: 0`, `word-break: break-word`), hỗ trợ xoay ngang/dọc trên iPad.
   - Nút **"Đạt tất cả"** cho từng chặng để tối ưu tốc độ chấm điểm, chỉ cần bấm sửa các mục có sai sót.
3. **Cơ chế Dirty Guard & Auto-save Nháp:**
   - Tích hợp cảnh báo khi người dùng vô tình bấm tải lại trang hoặc điều hướng khi có thay đổi chưa lưu.
   - Tự động lưu nháp dữ liệu vào SQLite server định kỳ mỗi 30 giây để chống mất mát dữ liệu do chập chờn wifi bệnh viện.

---

## PHẦN II: QUY CHUẨN XUẤT TỆP THÀNH PHẨM DOCX & PDF (DOCUMENT EXPORT INTEGRITY)

### ĐIỀU 4: KHÓA CỨNG BẢNG BIỂU & CHỐNG LỖI DÀN TRANG DOCX (RULE 1.1, 1.1.1, 1.1.2)
Khi xuất biểu mẫu `BK-GS-ĐD.01` dạng `.docx` bằng `python-docx`:

1. **Chống lỗi giãn dòng Justify (Rule 1.1):**
   - Tuyệt đối **không** chèn `\n` bên trong một `Paragraph` đang ở chế độ căn đều `JUSTIFY`. Mỗi dòng gạch đầu dòng, tiêu đề phụ phải là một `Paragraph` riêng biệt.
2. **Khóa cứng Bảng Tiêu đề (Rule 1.1.1):**
   - Khóa cứng layout bảng tiêu đề bằng XML: `w:tblLayout w:type="fixed"` và `w:tblW w:w="9360" w:type="dxa"` (tương đương 6.5 inch chiều rộng vùng in khổ A4 lề 30mm - 15mm).
   - Tỷ lệ cột tiêu đề chuẩn:
     - **Cột Trái (Đơn vị ban hành & Số hiệu):** `3300 dxa (~2.29 inch)`.
     - **Cột Phải (Quốc hiệu, Tiêu ngữ, Ngày tháng):** `6060 dxa (~4.21 inch)` $\rightarrow$ Đảm bảo dòng *"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"* trọn vẹn trên 1 dòng duy nhất, **không bao giờ bị rớt chữ "NAM"**.
3. **Khóa cứng Độ rộng Cột Ô Bảng Dữ liệu (Rule 1.1.2):**
   - **Bắt buộc** ghi đè `<w:tcW>` trên từng ô (`cell`) của toàn bộ các hàng trong bảng dữ liệu (`table.rows`), không để Word tự chia đều cột làm bóp nghẹt chữ.
   - Bắt buộc chèn `<w:cantSplit/>` vào `trPr` của mọi hàng trong bảng để chống Word xé đôi nội dung ô giữa 2 trang giấy.
   - Chèn `<w:tblHeader/>` cho dòng tiêu đề để tự động lặp lại khi bảng kéo dài qua nhiều trang.
4. **Quy tắc Danh sách Tên Nhân sự (Rule 1.1.3):**
   - Mỗi giám sát viên / chuyên gia nằm trên một dòng riêng biệt (`\n`), tuyệt đối **không** dùng dấu phẩy `,` nối giữa các tên.

### ĐIỀU 5: XUẤT PDF QUA WORD CONTAINER BRIDGE KHÔNG POPUP QUYỀN (ZERO-PROMPT PROTOCOL)
1. **Cầu nối Thư mục Container Word:**
   - Khi chuyển đổi `.docx` sang `.pdf` bằng Microsoft Word AppleScript trên macOS, **BẮT BUỘC** sao chép file trung gian vào thư mục Container nội bộ của Word:
     `~/Library/Containers/com.microsoft.Word/Data/Documents/`
   - Nhờ thuộc sandbox nội bộ của Word, macOS sẽ **100% không bao giờ hiện hộp thoại "Grant File Access"**, giúp quá trình xuất PDF diễn ra ngầm hoàn toàn tự động mà người dùng không cần can thiệp.

---

## PHẦN III: QUY CHUẨN CÔNG THỨC CHẤM ĐIỂM & THỐNG KÊ (SCORING & ANALYTICS)

### ĐIỀU 6: CÔNG THỨC TÍNH TỶ LỆ TUÂN THỦ & 4 BẬC XẾP LOẠI CHUẨN BK-GS-ĐD.01
1. **Công thức tính Tỷ lệ Tuân thủ Chuẩn:**
   $$\text{Tỷ lệ Tuân thủ (\%)} = \left[ \frac{\text{Tổng điểm Đạt}}{100 - \text{Tổng điểm các mục Không Áp Dụng (KAP)}} \right] \times 100\%$$
   *(Ghi chú: Đối với các khoa đặc thù như Chẩn đoán hình ảnh, Xét nghiệm, Khám bệnh... các mục buồng bệnh nội trú hoặc truyền máu nếu không phát sinh sẽ được đánh dấu KAP và trừ khỏi mẫu số, đảm bảo công bằng tuyệt đối).*
2. **Quy chuẩn 4 Bậc Xếp loại Chất lượng:**
   * 🟢 **Đạt (90 - 100%):** Tuân thủ tốt mọi quy định chuyên môn, chăm sóc an toàn; tiếp tục duy trì phát huy.
   * 🔵 **Tốt / Đạt yêu cầu (80 - 89%):** Đạt chuẩn thực hành, chỉ tồn tại một số sai sót hành chính nhỏ không ảnh hưởng trực tiếp đến an toàn NB.
   * 🟡 **Cần cải tiến (70 - 79%):** Có sai sót quy trình; Khoa phải lập kế hoạch hành động khắc phục trong 48 giờ và báo cáo Phòng Điều dưỡng.
   * 🔴 **KHÔNG ĐẠT (< 70% hoặc Vi phạm An toàn NB nghiêm trọng):** Tái giám sát lại sau 03 - 05 ngày. *(Lỗi vi phạm lập biên bản: Nhầm NB, nhầm nhóm máu/thuốc, dư thuốc, thiếu thuốc nghiêm trọng hoặc báo cáo sai sự thật).*

### ĐIỀU 7: NGUYÊN TẮC ĐỒNG BỘ THAY ĐỔI (RULE 1 SYNCHRONOUS CHANGE PRINCIPLE)
Khi thay đổi bất kỳ danh mục khoa, tiêu chí, thang điểm hay logic xếp loại nào:
* **PHẢI** cập nhật đồng bộ trong cùng một commit trên cả: Code backend (`models.py`, `seed_data.py`), Frontend (`inspection.js`, `dashboard.js`), Database schema, Tài liệu `CONTEXT.md` và Template DOCX.
