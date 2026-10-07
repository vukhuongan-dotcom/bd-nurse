"""
Test Suite for Crosscheck 07/10/2026:
- STT Unified itemNoMap
- Department name clean optgroup
- Print table layout, overflow-wrap, colgroup
- Textarea autoResize and scrollTop=0
BD-NURSE (BK-GS-ĐD.01)
"""

import asyncio
import os
import subprocess
from playwright.async_api import async_playwright

async def run_all_tests():
    print("======================================================================")
    print("       LỆNH 4 — BÁO CÁO KIỂM THỬ CROSSCHECK 07/10/2026               ")
    print("======================================================================")

    url = "file:///tmp/nurse_app/_site/index.html"
    failures = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1366, "height": 900})
        await page.goto(url, wait_until="networkidle")
        await page.wait_for_timeout(800)

        # 1. Chọn khoa "Phẫu thuật Đại trực tràng"
        # Tìm option có text chứa "Phẫu thuật Đại trực tràng"
        dept_select = page.locator("#inspect-dept-select")
        dept_options = await dept_select.locator("option").all()
        target_val = None
        for opt in dept_options:
            val = await opt.get_attribute("value")
            text = (await opt.inner_text()).strip()
            if "Phẫu thuật Đại trực tràng" in text:
                target_val = val
                break
        
        if target_val:
            await dept_select.select_option(target_val)
            await page.wait_for_timeout(300)

        # 2. Thiết lập dữ liệu kiểm thử:
        # - Mục 12.2 (crit ID 25): Không đạt, điểm thực tế 1.00đ, ghi chú 300 ký tự liền không khoảng trắng
        long_note = "dfdfdfdfzcdsdsd" + ("s" * 200) + "adasdasdasdadadasdsadasdadadadadadadadas"  # 255+ chars
        if len(long_note) < 300:
            long_note += "x" * (300 - len(long_note))

        # Tiêu chuẩn 12.2 là ID 25
        # Mở note box và điền
        await page.evaluate(f"""() => {{
            InspectionForm.setCriterionStatus(25, 'FAILED', 1.00);
            InspectionForm.onDefectNoteChange(25, `{long_note}`);

            // Mục 23.4 là ID 63: Không đạt, điểm 0.00đ, ghi chú ngắn
            InspectionForm.setCriterionStatus(63, 'FAILED', 0.00);
            InspectionForm.onDefectNoteChange(63, 'Thiếu chữ ký bàn giao chuyên môn');

            // 1 mục KAP: Mục 1.3 (ID 3)
            InspectionForm.setCriterionStatus(3, 'NA', 0.00);
            InspectionForm.onDefectNoteChange(3, 'Không áp dụng');

            InspectionForm.populatePrintSheet();
        }}""")
        await page.wait_for_timeout(500)

        # >>> KIỂM TRA (a): Bản in page.pdf(A4) -> pdftotext
        print("\n>>> KIỂM TRA (a): Bản in PDF & Trích xuất Text")
        pdf_path = "/tmp/test_output_crosscheck.pdf"
        os.makedirs("/tmp", exist_ok=True)
        await page.pdf(
            path=pdf_path,
            format="A4",
            margin={"top": "15mm", "right": "15mm", "bottom": "15mm", "left": "15mm"},
            print_background=True
        )

        pdftotext_cmd = "/Users/khuonganvu/.local/bin/pdftotext"
        txt_path = "/tmp/test_output_crosscheck.txt"
        subprocess.run([pdftotext_cmd, pdf_path, txt_path], check=True)
        with open(txt_path, "r", encoding="utf-8") as f:
            pdf_text = f.read()

        has_clean_dept = "Khoa được giám sát: Phẫu thuật Đại trực tràng" in pdf_text
        has_no_block_paren = "(Ngoại" not in pdf_text
        has_12_2 = "12.2" in pdf_text
        has_no_12_12 = "12.12" not in pdf_text
        has_def_12_2 = "Mục 12.2" in pdf_text
        has_def_23_4 = "Mục 23.4" in pdf_text

        print(f"  Có 'Khoa được giám sát: Phẫu thuật Đại trực tràng': {has_clean_dept}")
        print(f"  KHÔNG có '(Ngoại': {has_no_block_paren}")
        print(f"  Có '12.2': {has_12_2} | KHÔNG có '12.12': {has_no_12_12}")
        print(f"  Danh sách tồn tại có 'Mục 12.2': {has_def_12_2}")
        print(f"  Danh sách tồn tại có 'Mục 23.4': {has_def_23_4}")

        if not (has_clean_dept and has_no_block_paren and has_12_2 and has_no_12_12 and has_def_12_2 and has_def_23_4):
            failures.append("KIỂM TRA (a) THẤT BẠI: Tiêu đề khoa còn dính ngoặc hoặc STT 12.12 chưa đổi thành 12.2 hoặc danh sách tồn tại thiếu số con.")
            print("  ==> KẾT QUẢ (a): FAIL")
        else:
            print("  ==> KẾT QUẢ (a): PASS")

        # >>> KIỂM TRA (b): Đo trong page.emulate_media('print')
        print("\n>>> KIỂM TRA (b): Khóa cứng Layout & Chống tràn nội dung Print")
        await page.emulate_media(media="print")
        await page.wait_for_timeout(300)

        tbl_metrics = await page.evaluate("""() => {
            const tbl = document.querySelector('.print-criteria-table');
            if (!tbl) return null;
            const rect = tbl.getBoundingClientRect();
            
            // Đo tất cả các ô td
            const tds = Array.from(tbl.querySelectorAll('tbody td'));
            let maxOverflow = 0;
            let overflowingCells = 0;
            tds.forEach(td => {
                const diff = td.scrollWidth - td.clientWidth;
                if (diff > 1) {
                    overflowingCells++;
                    if (diff > maxOverflow) maxOverflow = diff;
                }
            });

            // Đo độ rộng cột Tiêu chuẩn đánh giá (cột 3)
            const thCrit = tbl.querySelectorAll('th')[2];
            const thCritWidth = thCrit ? thCrit.getBoundingClientRect().width : 0;
            const critRatio = rect.width > 0 ? (thCritWidth / rect.width) : 0;

            return {
                tableWidth: rect.width,
                overflowingCells: overflowingCells,
                maxOverflow: maxOverflow,
                critRatio: critRatio
            };
        }""")

        print(f"  Bề rộng bảng criteria table: {tbl_metrics['tableWidth']}px")
        print(f"  Số ô bị tràn nội dung (scrollWidth > clientWidth + 1): {tbl_metrics['overflowingCells']}")
        print(f"  Tỷ lệ cột 'Tiêu chuẩn đánh giá': {tbl_metrics['critRatio']*100:.1f}% (Yêu cầu >= 30%)")

        if tbl_metrics['overflowingCells'] > 0 or tbl_metrics['critRatio'] < 0.30:
            failures.append(f"KIỂM TRA (b) THẤT BẠI: Có {tbl_metrics['overflowingCells']} ô bị tràn hoặc tỷ lệ cột tiêu chuẩn < 30%.")
            print("  ==> KẾT QUẢ (b): FAIL")
        else:
            print("  ==> KẾT QUẢ (b): PASS")

        await page.emulate_media(media="screen")

        # >>> KIỂM TRA (c): Web 1366 + 390: ô tồn tại scrollHeight <= clientHeight & scrollTop = 0
        print("\n>>> KIỂM TRA (c): Textarea Tồn tại AutoResize & Chống trôi mép trên (scrollTop = 0)")
        
        async def test_textarea_stability(test_page, width_name):
            # Thêm/bớt mục Không đạt 5 lần
            for i in range(5):
                # Toggle mục 10 (crit ID 20)
                st = 'FAILED' if i % 2 == 0 else 'ACHIEVED'
                await test_page.evaluate(f"InspectionForm.setCriterionStatus(20, '{st}');")
                await test_page.wait_for_timeout(100)

            res = await test_page.evaluate("""() => {
                const el = document.getElementById('corrective-deficiencies');
                return {
                    scrollHeight: el.scrollHeight,
                    clientHeight: el.clientHeight,
                    scrollTop: el.scrollTop
                };
            }""")
            print(f"  [{width_name}] scrollHeight: {res['scrollHeight']}px | clientHeight: {res['clientHeight']}px | scrollTop: {res['scrollTop']}px")
            return res

        res_1366 = await test_textarea_stability(page, "Desktop 1366px")
        
        # Test mobile 390px
        page_m = await browser.new_page(viewport={"width": 390, "height": 844})
        await page_m.goto(url, wait_until="networkidle")
        await page_m.wait_for_timeout(500)
        res_390 = await test_textarea_stability(page_m, "Mobile 390px")

        # scrollHeight <= clientHeight + 1 (cho phép sai số 1px subpixel) và scrollTop == 0
        pass_c = (res_1366['scrollHeight'] <= res_1366['clientHeight'] + 1 and res_1366['scrollTop'] == 0 and
                  res_390['scrollHeight'] <= res_390['clientHeight'] + 1 and res_390['scrollTop'] == 0)

        if not pass_c:
            failures.append("KIỂM TRA (c) THẤT BẠI: Textarea bị trôi scrollTop hoặc scrollHeight > clientHeight (bị cuộn ẩn).")
            print("  ==> KẾT QUẢ (c): FAIL")
        else:
            print("  ==> KẾT QUẢ (c): PASS")

        # >>> KIỂM TRA (d): Web panel tóm tắt & Top 5 lỗi Dashboard hiện 'Mục 12.2'
        print("\n>>> KIỂM TRA (d): Panel tóm tắt & Top 5 lỗi Dashboard hiện số con (Mục 12.2)")
        
        # Đặt lại mục 25 không đạt
        await page.evaluate("""() => {
            InspectionForm.setCriterionStatus(25, 'FAILED', 1.00);
            InspectionForm.onDefectNoteChange(25, 'Lỗi truyền máu');
            InspectionForm.renderDefectsList();
        }""")
        await page.wait_for_timeout(300)

        summary_text = await page.locator("#desktop-defects-list").inner_text()
        has_summary_12_2 = "12.2" in summary_text
        has_no_summary_bare_12 = "Mục 12:" not in summary_text and "Mục 12 (" not in summary_text

        # Chuyển sang Dashboard tab và render top defects có tiêu chuẩn 25
        await page.evaluate("""() => {
            const crit = (App.criteria || []).find(c => c.id === 25);
            Dashboard.renderTopDefects([{
                id: 25,
                criterion_id: 25,
                thu_tu: crit ? crit.thu_tu : 25,
                muc_stt: 12,
                muc_ten: 'Quy trình An toàn Truyền máu tại giường',
                failed_rate: 45.5
            }]);
        }""")
        await page.wait_for_timeout(300)
        top_defects_text = await page.locator("#top-defects-container").inner_text()
        has_dash_12_2 = "12.2" in top_defects_text
        has_no_dash_bare_12 = "Mục 12:" not in top_defects_text

        print(f"  Panel tóm tắt hiện '12.2': {has_summary_12_2} (không bare 'Mục 12': {has_no_summary_bare_12})")
        print(f"  Top 5 Dashboard hiện '12.2': {has_dash_12_2} (không bare 'Mục 12': {has_no_dash_bare_12})")

        if not (has_summary_12_2 and has_dash_12_2):
            failures.append("KIỂM TRA (d) THẤT BẠI: Panel tóm tắt hoặc Top 5 Dashboard còn hiển thị 'Mục 12' thay vì 'Mục 12.2'.")
            print("  ==> KẾT QUẢ (d): FAIL")
        else:
            print("  ==> KẾT QUẢ (d): PASS")

        # >>> KIỂM TRA (e): Đối chứng 63/63 Đạt -> Bản in chuẩn 63 số liên tục 1.1 ... 23.4
        print("\n>>> KIỂM TRA (e): Đợt đối chứng 63/63 Đạt")
        await page.evaluate("""() => {
            InspectionForm.resetForm();
            InspectionForm.populatePrintSheet();
        }""")
        await page.wait_for_timeout(400)

        pdf_path_63 = "/tmp/test_output_63_pass.pdf"
        txt_path_63 = "/tmp/test_output_63_pass.txt"
        await page.pdf(path=pdf_path_63, format="A4", print_background=True)
        subprocess.run([pdftotext_cmd, pdf_path_63, txt_path_63], check=True)
        with open(txt_path_63, "r", encoding="utf-8") as f:
            pdf_text_63 = f.read()

        has_no_defects_clean = "Không có tồn tại, sai sót quy trình nào ghi nhận" in pdf_text_63
        # Trích xuất toàn bộ STT số con từ bảng in
        extracted_item_numbers = await page.evaluate("""() => {
            const rows = Array.from(document.querySelectorAll('.print-criteria-table tbody tr.print-data-row'));
            return rows.map(r => r.cells[0]?.textContent?.trim() || '');
        }""")
        
        has_63_numbers = len(extracted_item_numbers) == 63
        first_num = extracted_item_numbers[0] if extracted_item_numbers else ""
        last_num = extracted_item_numbers[-1] if extracted_item_numbers else ""
        has_correct_sequence = first_num == "1.1" and last_num == "23.4" and "12.2" in extracted_item_numbers and "12.12" not in extracted_item_numbers

        print(f"  Bản in có câu 'Không có tồn tại...': {has_no_defects_clean}")
        print(f"  Tổng số dòng in: {len(extracted_item_numbers)} (Kỳ vọng: 63)")
        print(f"  Dòng đầu: '{first_num}' | Dòng cuối: '{last_num}' | Có 12.2 & không 12.12: {has_correct_sequence}")

        if not (has_no_defects_clean and has_63_numbers and has_correct_sequence):
            failures.append("KIỂM TRA (e) THẤT BẠI: Đối chứng 63 dòng STT chưa chuẩn xác liên tục.")
            print("  ==> KẾT QUẢ (e): FAIL")
        else:
            print("  ==> KẾT QUẢ (e): PASS")

        # >>> CHỤP ẢNH MINH CHỨNG (f)
        shot_print_path = "/Users/khuonganvu/.gemini/antigravity/brain/dca807f9-6aa7-4e00-9992-fb4f172e2704/crosscheck_print_12_2_longnote.png"
        shot_web_path = "/Users/khuonganvu/.gemini/antigravity/brain/dca807f9-6aa7-4e00-9992-fb4f172e2704/crosscheck_web1366_deficiencies.png"

        # Tái lập ca test 12.2 long note để chụp ảnh
        await page.evaluate(f"""() => {{
            InspectionForm.setCriterionStatus(25, 'FAILED', 1.00);
            InspectionForm.onDefectNoteChange(25, `{long_note}`);
            InspectionForm.populatePrintSheet();
        }}""")
        await page.wait_for_timeout(300)

        # Chụp ô tồn tại trên web 1366
        def_card = page.locator("#corrective-plan-details")
        if await def_card.count() > 0:
            await def_card.screenshot(path=shot_web_path)
            print(f"\n  Đã chụp ảnh Web 1366 ô tồn tại: {shot_web_path}")

        # Chụp phần in bảng có dòng 12.2
        await page.emulate_media(media="print")
        row_12_2 = page.locator("tr.print-data-row:has-text('DHST đủ 3 thời điểm')")
        if await row_12_2.count() > 0:
            await row_12_2.screenshot(path=shot_print_path)
            print(f"  Đã chụp ảnh dòng in 12.2 + ghi chú dài: {shot_print_path}")

        await page.emulate_media(media="screen")
        await browser.close()

    print("\n======================================================================")
    if failures:
        print(f"  TỔNG KẾT: CÓ {len(failures)} MỤC THẤT BẠI (TEST ĐỎ TRƯỚC KHI SỬA):")
        for f in failures:
            print(f"    - {f}")
        print("======================================================================")
        return False
    else:
        print("  TỔNG KẾT: TẤT CẢ CÁC MỤC KIỂM THỬ ĐỀU ĐẠT CHUẨN XANH (PASS 100%)")
        print("======================================================================")
        return True

if __name__ == "__main__":
    asyncio.run(run_all_tests())
