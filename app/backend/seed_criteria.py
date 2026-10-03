"""
Seed Script for BD-NURSE Criteria (BK-GS-ĐD.01)
Đọc trực tiếp từ Table 1 của templates/BK-GS-DD.01_template.docx để nạp 63 dòng tiêu chuẩn con vào DB.
Tuyệt đối không gõ tay, đảm bảo 100% khớp văn bản mẫu gốc.
"""

import docx
from pathlib import Path
from database import get_connection, init_db

TEMPLATE_PATH = Path("/Users/khuonganvu/Library/CloudStorage/GoogleDrive-vukhuongan@gmail.com/Drive của tôi/KHÁC/DAO/WEB KIỂM TRA CHẤT LƯỢNG KHOA/templates/BK-GS-DD.01_template.docx")

STAGE_MAP = {
    range(4, 17): ('Chặng I', 'TẠI BUỒNG BỆNH & TRỰC TIẾP TRÊN NGƯỜI BỆNH'),
    range(18, 30): ('Chặng II', 'THỰC HIỆN KỸ THUẬT CHĂM SÓC, SỬ DỤNG THUỐC & AN TOÀN'),
    range(31, 43): ('Chặng III', 'TỦ THUỐC, PHÒNG ĐIỀU TRỊ, TRANG THIẾT BỊ & KSNK'),
    range(44, 66): ('Chặng IV', 'THỰC HIỆN CÁC BIỂU MẪU CỦA ĐIỀU DƯỠNG TRÊN HỒ SƠ BỆNH ÁN ĐIỆN TỬ'),
    range(67, 71): ('Chặng V', 'SỔ SÁCH BÀN GIAO'),
}


def seed_criteria():
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    # Kiểm tra xem đã có dữ liệu criteria chưa
    cursor.execute("SELECT COUNT(*) FROM criteria;")
    count = cursor.fetchone()[0]
    if count >= 63:
        print(f"[Seed Criteria] Bảng criteria đã có sẵn {count} dòng tiêu chuẩn con. Bỏ qua seed.")
        conn.close()
        return

    doc = docx.Document(str(TEMPLATE_PATH))
    t1 = doc.tables[1]

    inserted = 0
    current_muc_stt = 0
    current_muc_ten = ""

    for idx in range(4, 71):
        # Xác định chặng
        current_chang = None
        for r_range, (s_name, s_desc) in STAGE_MAP.items():
            if idx in r_range:
                current_chang = s_name
                break
        if not current_chang:
            continue # Bỏ qua các hàng tiêu đề chặng (Row 17, 30, 43, 66)

        row = t1.rows[idx]
        stt_str = row.cells[0].text.strip()
        muc_ten_str = row.cells[1].text.strip().replace('\n', ' ')
        noi_dung = row.cells[2].text.strip()
        diem_str = row.cells[3].text.strip()

        if stt_str:
            try:
                current_muc_stt = int(stt_str)
            except ValueError:
                pass
        if muc_ten_str:
            current_muc_ten = muc_ten_str

        diem = int(diem_str)
        inserted += 1

        cursor.execute("""
        INSERT INTO criteria (chang, muc_stt, muc_ten, noi_dung, diem, thu_tu, template_row)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (current_chang, current_muc_stt, current_muc_ten, noi_dung, diem, inserted, idx))

    conn.commit()
    conn.close()
    print(f"[Seed Criteria] Đã nạp thành công {inserted} dòng tiêu chuẩn con vào cơ sở dữ liệu.")


if __name__ == '__main__':
    seed_criteria()
