"""
Seed Script for BD-NURSE Departments
Nạp danh mục 27 khoa được giám sát vào cơ sở dữ liệu.
Phân chia khối khoa là ĐỀ XUẤT, kèm preset KAP cho các khoa đặc thù (chờ BS. An duyệt).
"""

import json
from database import get_connection, init_db

DEPARTMENTS_DATA = [
    {"code": "NG_TH", "name": "Ngoại Tiêu hóa", "block": "Ngoại Tiêu hóa - Gan mật", "kap_presets": []},
    {"code": "PTDTT", "name": "Phẫu thuật Đại trực tràng", "block": "Ngoại Tiêu hóa - Gan mật", "kap_presets": []},
    {"code": "NG_GM", "name": "Ngoại Gan mật", "block": "Ngoại Tiêu hóa - Gan mật", "kap_presets": []},
    {"code": "UG", "name": "U Gan", "block": "Ngoại Tiêu hóa - Gan mật", "kap_presets": []},
    {"code": "NG_LNBC", "name": "Ngoại Lồng ngực – Bướu cổ", "block": "Ngoại Chuyên khoa", "kap_presets": []},
    {"code": "NG_THOP", "name": "Ngoại Tổng hợp", "block": "Ngoại Chuyên khoa", "kap_presets": []},
    {"code": "UB_TN", "name": "Ung bướu Tiết niệu", "block": "Khối Tiết niệu", "kap_presets": []},
    {"code": "NIEU_A", "name": "Niệu A", "block": "Khối Tiết niệu", "kap_presets": []},
    {"code": "NIEU_B", "name": "Niệu B", "block": "Khối Tiết niệu", "kap_presets": []},
    {"code": "ST_CS", "name": "Sỏi thận Chuyên sâu", "block": "Khối Tiết niệu", "kap_presets": []},
    {"code": "NIEU_C", "name": "Niệu C", "block": "Khối Tiết niệu", "kap_presets": []},
    {"code": "NIEU_DAO", "name": "Niệu đạo", "block": "Khối Tiết niệu", "kap_presets": []},
    {"code": "UB", "name": "Ung bướu", "block": "Khối Nội & Chuyên khoa", "kap_presets": []},
    {"code": "NOI_TH", "name": "Nội Tổng hợp", "block": "Khối Nội & Chuyên khoa", "kap_presets": []},
    {"code": "NAM_HOC", "name": "Nam học", "block": "Khối Tiết niệu", "kap_presets": []},
    {"code": "LOC_MAU", "name": "Lọc máu – Nội thận", "block": "Khối Nội & Chuyên khoa", "kap_presets": []},
    {"code": "NS_NIEU", "name": "Nội soi Niệu", "block": "Khối Can thiệp & Thủ thuật", "kap_presets": []},
    {"code": "HS_CC", "name": "Hồi sức Cấp cứu", "block": "Khối Hồi sức & Phẫu thuật", "kap_presets": []},
    {"code": "ICU", "name": "Hồi sức Tích cực và Chống độc", "block": "Khối Hồi sức & Phẫu thuật", "kap_presets": []},
    {"code": "GMHS_1", "name": "Gây mê Hồi sức I", "block": "Khối Hồi sức & Phẫu thuật", "kap_presets": []},
    {"code": "GMHS_2", "name": "Gây mê Hồi sức II", "block": "Khối Hồi sức & Phẫu thuật", "kap_presets": []},
    {"code": "NIEU_NU", "name": "Niệu nữ", "block": "Khối Tiết niệu", "kap_presets": []},
    {"code": "PT_TMM", "name": "Phẫu thuật Tim – Mạch máu", "block": "Ngoại Chuyên khoa", "kap_presets": []},
    {"code": "NS_TH", "name": "Nội soi Tiêu hóa", "block": "Khối Can thiệp & Thủ thuật", "kap_presets": []},
    {"code": "CDHA", "name": "Chẩn đoán hình ảnh", "block": "Khối Cận lâm sàng & Khám", "kap_presets": ["chang_1", "muc_9", "muc_10", "muc_11", "muc_12"]},
    {"code": "XN", "name": "Xét nghiệm", "block": "Khối Cận lâm sàng & Khám", "kap_presets": ["chang_1", "muc_9", "muc_10", "muc_11", "muc_12"]},
    {"code": "KHAM_BENH", "name": "Khám bệnh", "block": "Khối Cận lâm sàng & Khám", "kap_presets": ["chang_1", "muc_9", "muc_11", "muc_12"]}
]


def seed_departments():
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM departments;")
    count = cursor.fetchone()[0]
    if count >= 27:
        print(f"[Seed Departments] Bảng departments đã có sẵn {count} khoa. Bỏ qua seed.")
        conn.close()
        return

    for dept in DEPARTMENTS_DATA:
        cursor.execute("""
        INSERT OR IGNORE INTO departments (code, name, block, kap_preset_json)
        VALUES (?, ?, ?, ?);
        """, (dept['code'], dept['name'], dept['block'], json.dumps(dept['kap_presets'])))

    conn.commit()
    conn.close()
    print("[Seed Departments] Đã nạp thành công 27 khoa vào cơ sở dữ liệu.")


if __name__ == '__main__':
    seed_departments()
