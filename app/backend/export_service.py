"""
Export Service for BD-NURSE (BK-GS-ĐD.01)
Điền dữ liệu trực tiếp vào mẫu gốc templates/BK-GS-DD.01_template.docx (In-place Filling).
Tuyệt đối không tái cấu trúc bảng biểu, bảo toàn 100% format gốc và chuyển đổi PDF ngầm qua Word Container Bridge.
"""

import os
import shutil
import sqlite3
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

from database import get_connection

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).resolve().parent.parent.parent))
TEMPLATE_PATH = PROJECT_ROOT / "templates" / "BK-GS-DD.01_template.docx"
DOCX_EXPORT_DIR = PROJECT_ROOT / "exports" / "docx"
PDF_EXPORT_DIR = PROJECT_ROOT / "exports" / "pdf"

WORD_CONTAINER_DIR = Path.home() / "Library" / "Containers" / "com.microsoft.Word" / "Data" / "Documents"


def set_run_font(run, font_name="Times New Roman", size_pt=10, bold=False, italic=False, color=None):
    """Thiết lập font chữ Times New Roman chuẩn."""
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color


def fill_cell_text(cell, text: str, font_name="Times New Roman", size_pt=10, bold=False, italic=False, align=WD_ALIGN_PARAGRAPH.LEFT):
    """Điền văn bản vào ô và định dạng font chữ chuẩn."""
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if i > 0:
            p = cell.add_paragraph()
            p.alignment = align
        run = p.add_run(line)
        set_run_font(run, font_name=font_name, size_pt=size_pt, bold=bold, italic=italic)


def export_inspection_docx(round_id: int, output_docx_path: Optional[str] = None) -> str:
    """
    Điền dữ liệu đợt kiểm tra vào template DOCX gốc BK-GS-ĐD.01.
    Chỉ điền vào các ô dữ liệu, giữ nguyên toàn bộ grid và layout gốc.
    """
    conn = get_connection()
    c = conn.cursor()

    # Lấy thông tin đợt kiểm tra
    c.execute("""
    SELECT r.*, d.name as dept_name, d.code as dept_code
    FROM inspection_rounds r
    JOIN departments d ON r.department_id = d.id
    WHERE r.id = ?;
    """, (round_id,))
    round_row = c.fetchone()
    if not round_row:
        conn.close()
        raise ValueError(f"Không tìm thấy đợt kiểm tra với id={round_id}")

    round_data = dict(round_row)

    # Lấy chi tiết 63 dòng con
    c.execute("""
    SELECT d.*, cr.template_row, cr.thu_tu, cr.diem, cr.noi_dung, cr.muc_ten
    FROM inspection_details d
    JOIN criteria cr ON d.criterion_id = cr.id
    WHERE d.round_id = ?
    ORDER BY cr.thu_tu;
    """, (round_id,))
    detail_rows = [dict(r) for r in c.fetchall()]

    # Lấy kế hoạch khắc phục
    c.execute("SELECT * FROM corrective_plans WHERE round_id = ?;", (round_id,))
    plan_row = c.fetchone()
    plan_data = dict(plan_row) if plan_row else {}

    conn.close()

    # Mở template gốc
    doc = docx.Document(str(TEMPLATE_PATH))
    t1 = doc.tables[1]
    t2 = doc.tables[2]
    t3 = doc.tables[3]

    # 1. Điền thông tin chung Table 1 hàng 0 & hàng 1
    # Hàng 0: Khoa & Thời gian
    fill_cell_text(
        t1.rows[0].cells[0],
        f"Khoa được giám sát: {round_data['dept_name']}",
        size_pt=10, bold=True
    )
    fill_cell_text(
        t1.rows[0].cells[3],
        f"Thời gian: {round_data['inspection_time']}",
        size_pt=10, bold=False
    )

    # Hàng 1: ĐD Trưởng khoa & Đoàn giám sát
    fill_cell_text(
        t1.rows[1].cells[0],
        f"ĐD Trưởng khoa: {round_data['head_nurse']}",
        size_pt=10, bold=False
    )
    inspectors_text = f"Thành viên giám sát:\n{round_data['inspectors']}"
    fill_cell_text(
        t1.rows[1].cells[3],
        inspectors_text,
        size_pt=10, bold=False
    )

    # Ghi tiêu đề hàng 2 Table 1: cells[4] = "Điểm thực tế", cells[5] = "Ghi chú"
    fill_cell_text(t1.rows[2].cells[4], "Điểm thực tế", size_pt=9.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    fill_cell_text(t1.rows[2].cells[5], "Ghi chú", size_pt=9.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)

    # 2. Điền 63 dòng tiêu chuẩn con theo template_row
    for det in detail_rows:
        t_row_idx = det['template_row']
        row = t1.rows[t_row_idx]
        status = det['status']
        defect_note = det.get('defect_note', '').strip()

        # Ô Điểm thực tế (trước đây là Đạt): cells[4]
        # Ô Ghi chú (trước đây là Không đạt / Ghi chú): cells[5]
        awarded_val = float(det.get('awarded_score', 0.0))
        if status == 'NA':
            fill_cell_text(row.cells[4], "", size_pt=10)
            na_note = f"Không áp dụng ({defect_note})" if defect_note else "Không áp dụng"
            fill_cell_text(row.cells[5], na_note, size_pt=9, italic=True)
        else:
            score_str = f"{awarded_val:.2f}".replace('.', ',')
            fill_cell_text(row.cells[4], score_str, size_pt=9.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
            fill_cell_text(row.cells[5], defect_note, size_pt=9, bold=False)

    # 3. Điền chân bảng Table 1 (hàng 71)
    effective_den = round_data['total_standard_score'] - round_data['total_kap_score']
    achieved_str = f"{float(round_data['total_achieved_score']):.2f}".replace('.', ',')
    den_str = f"{float(effective_den):.2f}".replace('.', ',')
    rate_str = f"{float(round_data['compliance_rate']):.1f}".replace('.', ',')
    summary_text = (
        f"Tổng điểm đạt: {achieved_str} / {den_str}    "
        f"(Tỷ lệ tuân thủ: {rate_str}% - Xếp loại: {round_data['rating']})"
    )
    fill_cell_text(t1.rows[71].cells[4], summary_text, size_pt=9.5, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT)

    # 4. Điền Table 2: Tồn tại & Kế hoạch khắc phục
    deficiencies = plan_data.get('deficiencies_summary', '')
    if not deficiencies.strip():
        deficiencies = "- Không có tồn tại, sai sót quy trình nào ghi nhận."
    t2_left_text = f"1. TỒN TẠI / SAI SÓT GHI NHẬN TẠI KHOA:\n{deficiencies}"
    fill_cell_text(t2.rows[2].cells[0], t2_left_text, size_pt=9.5)

    measures = plan_data.get('action_measures', 'Tiếp tục duy trì và phát huy.')
    deadline = plan_data.get('deadline', f"Ngày 30.10.{round_data['year']}")
    t2_right_text = (
        f"2. KẾ HOẠCH HÀNH ĐỘNG / KHẮC PHỤC:\n"
        f"- Biện pháp: {measures}\n"
        f"- Thời hạn hoàn thành: {deadline}"
    )
    fill_cell_text(t2.rows[2].cells[1], t2_right_text, size_pt=9.5)

    # 5. Điền Table 3: Khối chữ ký
    inspectors_lines = [l.strip() for l in round_data['inspectors'].splitlines() if l.strip()]
    if not inspectors_lines:
        inspectors_lines = [l.strip() for l in round_data['inspectors'].split(',') if l.strip()]
    if not inspectors_lines:
        inspectors_lines = ["Thành viên giám sát"]
    inspectors_str = "\n".join(inspectors_lines)
    fill_cell_text(t3.rows[1].cells[0], f"\n\n\n{inspectors_str}", size_pt=10, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    fill_cell_text(t3.rows[1].cells[1], f"\n\n\n{round_data['head_nurse']}", size_pt=10, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    fill_cell_text(t3.rows[1].cells[2], f"\n\n\n", size_pt=10, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER)

    # Xác định đường dẫn file xuất
    DOCX_EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    if not output_docx_path:
        filename = f"BK-GS-DD.01_{round_data['dept_code']}_Q{round_data['quarter']}_{round_data['year']}.docx"
        output_docx_path = str(DOCX_EXPORT_DIR / filename)

    doc.save(output_docx_path)
    return output_docx_path


def convert_docx_to_pdf(docx_path: str, output_pdf_path: Optional[str] = None) -> str:
    """
    Chuyển đổi DOCX sang PDF bằng Microsoft Word AppleScript qua Word Container Bridge.
    Đảm bảo 100% Zero-Prompt Protocol trên macOS (không popup xin quyền).
    """
    docx_file = Path(docx_path)
    if not docx_file.exists():
        raise FileNotFoundError(f"Không tìm thấy file DOCX: {docx_path}")

    PDF_EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    if not output_pdf_path:
        output_pdf_path = str(PDF_EXPORT_DIR / f"{docx_file.stem}.pdf")

    final_pdf = Path(output_pdf_path)

    # Tạo thư mục Container của Word nếu chưa có
    WORD_CONTAINER_DIR.mkdir(parents=True, exist_ok=True)

    # Tên file trung gian trong Container
    container_docx = WORD_CONTAINER_DIR / f"temp_{docx_file.name}"
    container_pdf = WORD_CONTAINER_DIR / f"temp_{docx_file.stem}.pdf"

    try:
        # Copy file DOCX vào Container
        shutil.copy2(str(docx_file), str(container_docx))

        # Chạy AppleScript qua osascript
        applescript = f'''
        tell application "Microsoft Word"
            set docPath to POSIX file "{container_docx}"
            set pdfPath to "{container_pdf}"
            open docPath
            set activeDoc to active document
            save as activeDoc file format format PDF file name pdfPath
            close activeDoc saving no
        end tell
        '''
        res = subprocess.run(["osascript", "-e", applescript], capture_output=True, text=True, timeout=30)
        if res.returncode != 0:
            raise RuntimeError(f"Lỗi chuyển đổi Word AppleScript: {res.stderr}")

        if not container_pdf.exists():
            raise FileNotFoundError(f"AppleScript hoàn thành nhưng không tìm thấy file PDF tại {container_pdf}")

        # Di chuyển PDF thành phẩm về thư mục đích
        shutil.move(str(container_pdf), str(final_pdf))

    finally:
        # Dọn dẹp tệp tạm trong Container
        if container_docx.exists():
            try: container_docx.unlink()
            except Exception: pass
        if container_pdf.exists():
            try: container_pdf.unlink()
            except Exception: pass

    return str(final_pdf)
