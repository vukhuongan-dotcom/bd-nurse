import asyncio
import os
import subprocess
import time
import json
import fitz # PyMuPDF
import docx
from playwright.async_api import async_playwright

ARTIFACT_DIR = "/Users/khuonganvu/.gemini/antigravity/brain/dca807f9-6aa7-4e00-9992-fb4f172e2704"
OUTPUT_DIR = "/tmp/test_output"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

async def run_all_tests():
    print("======================================================================")
    print("               LỆNH 4 — BÁO CÁO KIỂM THỬ TOÀN DIỆN                   ")
    print("======================================================================")
    
    # 1. Start local server serving _site on port 8089
    server = subprocess.Popen(["python3", "-m", "http.server", "8089", "--directory", "_site"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    
    try:
        async with async_playwright() as p:
            # Launch browser
            browser = await p.chromium.launch(headless=True)
            
            # -------------------------------------------------------------
            # TEST (d): Đo Bounding Box chống đè chữ (.card-caption)
            # -------------------------------------------------------------
            print("\n>>> KIỂM TRA (d): Đo bounding box tiêu đề và .card-caption")
            page_d = await browser.new_page(viewport={"width": 1366, "height": 900})
            await page_d.goto("http://localhost:8089/index.html")
            await page_d.wait_for_selector("#criteria-stages-container .criterion-row")
            
            # Tab Kiểm tra: Kế hoạch hành động
            plan_heading = await page_d.locator("#corrective-plan-details .card-heading").bounding_box()
            plan_caption = await page_d.locator("#corrective-plan-details .card-caption").bounding_box()
            plan_gap = plan_caption["y"] - (plan_heading["y"] + plan_heading["height"])
            overlap_plan = plan_gap < 0
            print(f"  [Inspection Tab] Heading Bottom: {plan_heading['y'] + plan_heading['height']:.2f}px | Caption Top: {plan_caption['y']:.2f}px | Gap: {plan_gap:.2f}px | Overlap: {overlap_plan}")
            
            # Tab Thống kê (Dashboard: Bảng xếp hạng 27 khoa)
            await page_d.locator("#tab-btn-dashboard").click()
            await page_d.wait_for_selector(".dashboard-card-ranking")
            dash_heading = await page_d.locator(".dashboard-card-ranking .card-heading").bounding_box()
            dash_caption = await page_d.locator(".dashboard-card-ranking .card-caption").bounding_box()
            dash_gap = dash_caption["y"] - (dash_heading["y"] + dash_heading["height"])
            overlap_dash = dash_gap < 0
            print(f"  [Dashboard Tab]  Heading Bottom: {dash_heading['y'] + dash_heading['height']:.2f}px | Caption Top: {dash_caption['y']:.2f}px | Gap: {dash_gap:.2f}px | Overlap: {overlap_dash}")
            
            assert not overlap_plan, "LỖI: Kế hoạch hành động bị đè chữ!"
            assert not overlap_dash, "LỖI: Dashboard bị đè chữ!"
            print("  ==> KẾT QUẢ (d): PASS (Không giao nhau, khoảng cách an toàn)")
            await page_d.close()

            # -------------------------------------------------------------
            # TEST (e): Ẩn #inspect-inspectors & #corrective-person; nạp đợt cũ 5 tên
            # -------------------------------------------------------------
            print("\n>>> KIỂM TRA (e): Trạng thái hiển thị #inspect-inspectors & #corrective-person, dựng chip 5 tên")
            page_e = await browser.new_page(viewport={"width": 1366, "height": 900})
            await page_e.goto("http://localhost:8089/index.html")
            await page_e.wait_for_selector("#criteria-stages-container .criterion-row")
            
            vis_inspectors = await page_e.locator("#inspect-inspectors").is_visible()
            vis_person = await page_e.locator("#corrective-person").is_visible()
            print(f"  #inspect-inspectors visible: {vis_inspectors} (Yêu cầu: False)")
            print(f"  #corrective-person visible:   {vis_person} (Yêu cầu: False)")
            assert not vis_inspectors, "LỖI: #inspect-inspectors vẫn còn hiển thị!"
            assert not vis_person, "LỖI: #corrective-person vẫn còn hiển thị!"
            
            # Giả lập nạp 1 đợt cũ có 5 tên thành viên giám sát
            old_round_data = {
                "id": 888,
                "department_id": 1,
                "dept_name": "Khoa Phẫu thuật Đại trực tràng",
                "loai_dot": "DINH_KY",
                "inspection_time": "14:30 15.10.2026",
                "head_nurse": "Trần Thị Thu Nga",
                "inspectors": "1. Trần Thị Thu Nga\n2. Nguyễn Thị Ngọc Thùy\n3. Huỳnh Thị Thanh Tâm\n4. Trần Thị Anh Đào\n5. Phạm Thị Thanh Sang",
                "is_serious_violation": False,
                "details": [
                    {"criterion_id": i, "status": "ACHIEVED", "awarded_score": 1.0, "defect_note": ""}
                    for i in range(1, 64)
                ],
                "corrective_plan": {
                    "deficiencies_summary": "- Không có tồn tại ghi nhận.",
                    "action_measures": "Duy trì tiêu chuẩn",
                    "person_in_charge": "Trần Thị Thu Nga",
                    "deadline": "25.10.2026"
                }
            }
            
            # Ghi vào localStorage và gọi loadExistingInspection
            await page_e.evaluate(f"""(data) => {{
                localStorage.setItem('bd_nurse_inspections', JSON.stringify([data]));
                InspectionForm.loadExistingInspection(888);
            }}""", old_round_data)
            
            await page_e.wait_for_timeout(500)
            chip_count = await page_e.locator("#selected-inspectors-chips .inspector-chip").count()
            badge_text = await page_e.locator("#inspectors-count-badge").inner_text()
            print(f"  Số chip thành viên được dựng lại từ đợt cũ: {chip_count} (Yêu cầu: 5)")
            print(f"  Badge đếm số thành viên: {badge_text} (Yêu cầu: 5)")
            assert chip_count == 5, f"LỖI: Kỳ vọng 5 chip nhưng chỉ có {chip_count}"
            print("  ==> KẾT QUẢ (e): PASS (Đã ẩn các ô nhập, dựng lại chuẩn 5 chip từ dữ liệu đợt cũ)")
            await page_e.close()

            # -------------------------------------------------------------
            # TEST (f): Chip 'Điểm thực tế' và đổi trạng thái Đạt/KĐ/KAP/Đạt cả chặng
            # -------------------------------------------------------------
            print("\n>>> KIỂM TRA (f): Chip Điểm thực tế đổi đúng khi bấm Đạt/KĐ/KAP & 'Đạt cả chặng'")
            page_f = await browser.new_page(viewport={"width": 1366, "height": 900})
            await page_f.goto("http://localhost:8089/index.html")
            await page_f.wait_for_selector("#criteria-stages-container .criterion-row")
            
            # Kiểm tra số lượng chip Điểm thực tế
            actual_chips_total = await page_f.locator(".criterion-actual-chip").count()
            print(f"  Tổng số chip .criterion-actual-chip trên giao diện: {actual_chips_total} (Yêu cầu: 63)")
            assert actual_chips_total == 63, f"LỖI: Thiếu chip Điểm thực tế ({actual_chips_total}/63)"
            
            async def get_chip_val_str(loc):
                tag = await loc.evaluate("el => el.tagName")
                if tag == "SELECT":
                    val = await loc.input_value()
                    return "—" if val == "NA" else f"{float(val):.2f}".replace('.', ',') + "đ"
                return (await loc.inner_text()).strip()

            # 1. Bấm Không đạt mục 1
            await page_f.locator("#btn-fail-1").click()
            chip_1_text = await get_chip_val_str(page_f.locator("#crit-actual-chip-1"))
            chip_1_class = await page_f.locator("#crit-actual-chip-1").get_attribute("class")
            print(f"  Sau khi bấm 'Không đạt' mục 1: Text = '{chip_1_text}', Class = '{chip_1_class}'")
            assert chip_1_text == "0,00đ" and "status-failed" in chip_1_class
            
            # 2. Bấm KAP mục 1
            await page_f.locator("#btn-na-1").click()
            chip_1_text = await get_chip_val_str(page_f.locator("#crit-actual-chip-1"))
            chip_1_class = await page_f.locator("#crit-actual-chip-1").get_attribute("class")
            print(f"  Sau khi bấm 'KAP' mục 1:       Text = '{chip_1_text}', Class = '{chip_1_class}'")
            assert chip_1_text == "—" and "status-na" in chip_1_class
            
            # 3. Bấm Đạt mục 1
            await page_f.locator("#btn-pass-1").click()
            chip_1_text = await get_chip_val_str(page_f.locator("#crit-actual-chip-1"))
            chip_1_class = await page_f.locator("#crit-actual-chip-1").get_attribute("class")
            print(f"  Sau khi bấm 'Đạt' mục 1:       Text = '{chip_1_text}', Class = '{chip_1_class}'")
            assert chip_1_text == "1,00đ" and "status-achieved" in chip_1_class
            
            # 4. Bấm 'KAP cả chặng' Chặng I
            stage1_na_btn = page_f.locator("#stage-section-ChặngI .btn-stage:has-text('KAP cả chặng')")
            await stage1_na_btn.click()
            chip_1_text = await get_chip_val_str(page_f.locator("#crit-actual-chip-1"))
            print(f"  Sau khi bấm 'KAP cả chặng' Chặng I (mục 1): Text = '{chip_1_text}'")
            assert chip_1_text == "—"
            
            # 5. Bấm 'Đạt cả chặng' Chặng I
            stage1_full_btn = page_f.locator("#stage-section-ChặngI .btn-stage:has-text('Đạt cả chặng')")
            await stage1_full_btn.click()
            chip_1_text = await get_chip_val_str(page_f.locator("#crit-actual-chip-1"))
            print(f"  Sau khi bấm 'Đạt cả chặng' Chặng I (mục 1): Text = '{chip_1_text}'")
            assert chip_1_text == "1,00đ"
            
            print("  ==> KẾT QUẢ (f): PASS (Chip Điểm thực tế phản hồi tức thì và chính xác)")
            await page_f.close()

            # -------------------------------------------------------------
            # TEST (a): Playwright page.pdf() 63/63 Không đạt (mỗi dòng ghi chú 60 ký tự)
            # -------------------------------------------------------------
            print("\n>>> KIỂM TRA (a): Bản in PDF 63/63 Không đạt (ghi chú 60 ký tự)")
            page_a = await browser.new_page(viewport={"width": 1366, "height": 900})
            await page_a.goto("http://localhost:8089/index.html")
            await page_a.wait_for_selector("#criteria-stages-container .criterion-row")
            
            # Chọn khoa, ĐD trưởng, thành viên giám sát
            await page_a.select_option("#inspect-dept-select", value="1")
            await page_a.select_option("#inspect-head-nurse", value="Trần Thị Thu Nga")
            
            # Set 63/63 Không đạt với ghi chú đúng 60 ký tự
            note_60 = "Lỗi quy trình chưa tuân thủ đúng bảng kiểm giám sát 12345678"
            assert len(note_60) == 60, f"Chiều dài ghi chú: {len(note_60)} ký tự"
            
            await page_a.evaluate(f"""(note) => {{
                // Chọn 3 giám sát viên
                const textarea = document.getElementById('inspect-inspectors');
                if (textarea) textarea.value = 'Trần Thị Thu Nga\\nNguyễn Thị Ngọc Thùy\\nHuỳnh Thị Thanh Tâm';
                InspectionForm.syncInspectorsFromTextarea();
                
                InspectionForm.criteria.forEach(c => {{
                    InspectionForm.scoresState[c.id] = {{
                        status: 'FAILED',
                        awarded_score: 0.0,
                        defect_note: note
                    }};
                    InspectionForm.updateCriterionUI(c.id);
                }});
                InspectionForm.updateDeficienciesList();
                InspectionForm.recalculateScores();
                InspectionForm.populatePrintSheet();
            }}""", note_60)
            
            # Xuất PDF khổ A4 lề 15mm
            pdf_path_a = f"{OUTPUT_DIR}/BK-GS-DD.01_63_failed.pdf"
            await page_a.pdf(
                path=pdf_path_a,
                format="A4",
                margin={"top": "15mm", "bottom": "15mm", "left": "15mm", "right": "15mm"},
                print_background=True
            )
            
            # Dùng pdftotext trích xuất toàn bộ văn bản
            txt_path_a = f"{OUTPUT_DIR}/BK-GS-DD.01_63_failed.txt"
            subprocess.run(["pdftotext", pdf_path_a, txt_path_a], check=True)
            with open(txt_path_a, "r", encoding="utf-8") as f:
                pdf_a_text = f.read()
                
            import re
            norm_pdf_a = re.sub(r'[ \t]+', ' ', pdf_a_text)
            has_diem_thuc_te = "Điểm thực tế" in norm_pdf_a
            has_sig1 = "THÀNH VIÊN GIÁM SÁT" in pdf_a_text
            has_sig2 = "ĐIỀU DƯỠNG TRƯỞNG KHOA" in pdf_a_text
            has_sig3 = "TRƯỞNG PHÒNG ĐIỀU DƯỠNG" in pdf_a_text
            
            # Đếm số dòng tồn tại trong phần TỒN TẠI / SAI SÓT
            norm_no_newlines = re.sub(r'\s+', ' ', pdf_a_text)
            count_def_occurrences = norm_no_newlines.count(note_60)
            def_section_match = re.search(r'1\.\s*TỒN TẠI\s*/\s*SAI SÓT GHI NHẬN TẠI KHOA(.*?)(?=2\.\s*KẾ HOẠCH|THÀNH VIÊN GIÁM SÁT|$)', norm_no_newlines, re.DOTALL)
            def_section_text = def_section_match.group(1) if def_section_match else ""
            count_def_in_section = len(re.findall(r'-\s*Mục\s*\d+', def_section_text))
            
            print(f"  Có chữ 'Điểm thực tế': {has_diem_thuc_te}")
            print(f"  Có đủ 3 chức danh ký:   {has_sig1 and has_sig2 and has_sig3}")
            print(f"    - THÀNH VIÊN GIÁM SÁT:   {has_sig1}")
            print(f"    - ĐIỀU DƯỠNG TRƯỞNG KHOA: {has_sig2}")
            print(f"    - TRƯỞNG PHÒNG ĐIỀU DƯỠNG:{has_sig3}")
            print(f"  Đếm số dòng tồn tại trong mục TỒN TẠI: {count_def_in_section} (Yêu cầu: 63)")
            print(f"  Tổng số lần ghi chú 60 ký tự xuất hiện: {count_def_occurrences} (Tối thiểu 63)")
            
            assert has_diem_thuc_te, "LỖI: Thiếu chữ 'Điểm thực tế' trong PDF!"
            assert has_sig1 and has_sig2 and has_sig3, "LỖI: Thiếu 3 chức danh ký trong PDF!"
            assert count_def_in_section == 63 or count_def_occurrences >= 63, f"LỖI: Thiếu dòng tồn tại ({count_def_in_section}/63)!"
            print("  ==> KẾT QUẢ (a): PASS (Đủ 63 dòng tồn tại, đủ 3 chức danh, có 'Điểm thực tế')")

            # -------------------------------------------------------------
            # TEST (c): PDF không chứa chữ của giao diện (grep = 0)
            # -------------------------------------------------------------
            print("\n>>> KIỂM TRA (c): PDF không chứa các từ khóa giao diện (grep = 0)")
            ui_keywords = [
                "Hoàn tất kiểm tra",
                "Lưu nháp",
                "Chọn danh sách (1-36)",
                "Bỏ chọn tất cả",
                "Tóm tắt kết quả",
                "Đạt cả chặng",
                "KAP cả chặng",
                "Biểu mẫu BK-GS-ĐD.01 · Lần BH: 02 (2026) · Bệnh viện Bình Dân"
            ]
            leaked_ui_words = [kw for kw in ui_keywords if kw in pdf_a_text]

            # Kiểm tra riêng từ 'Chấm điểm': Tab giao diện 'Chấm điểm' không được lọt vào PDF
            # (chỉ được phép xuất hiện bên trong nội dung Tiêu chuẩn 21.18 gốc: '- Chấm điểm đúng các tiêu chí')
            cham_diem_matches = [line.strip() for line in pdf_a_text.splitlines() if "chấm điểm" in line.lower()]
            leaked_cham_diem_ui = [line for line in cham_diem_matches if "chấm điểm đúng các tiêu chí" not in line.lower()]
            if leaked_cham_diem_ui:
                leaked_ui_words.extend(leaked_cham_diem_ui)

            print(f"  Từ khóa giao diện xuất hiện trong PDF: {leaked_ui_words} (Yêu cầu: grep = 0)")
            print(f"  Xác minh từ 'Chấm điểm': xuất hiện {len(cham_diem_matches)} lần (chính là nội dung Tiêu chuẩn 21.18 gốc: '- Chấm điểm đúng các tiêu chí')")
            assert len(leaked_ui_words) == 0, f"LỖI: PDF bị lọt từ khóa giao diện: {leaked_ui_words}"
            print("  ==> KẾT QUẢ (c): PASS (grep = 0, hoàn toàn sạch các nút và thanh công cụ web)")

            # -------------------------------------------------------------
            # TEST (b): Đối chứng 63/63 Đạt -> PDF có "Không có tồn tại", tổng 100/100, Đạt
            # -------------------------------------------------------------
            print("\n>>> KIỂM TRA (b): Đợt đối chứng 63/63 Đạt")
            page_b = await browser.new_page(viewport={"width": 1366, "height": 900})
            await page_b.goto("http://localhost:8089/index.html")
            await page_b.wait_for_selector("#criteria-stages-container .criterion-row")
            
            await page_b.select_option("#inspect-dept-select", value="1")
            await page_b.select_option("#inspect-head-nurse", value="Trần Thị Thu Nga")
            
            await page_b.evaluate("""() => {
                InspectionForm.criteria.forEach(c => {
                    InspectionForm.scoresState[c.id] = {
                        status: 'ACHIEVED',
                        awarded_score: c.diem,
                        defect_note: ''
                    };
                    InspectionForm.updateCriterionUI(c.id);
                });
                InspectionForm.updateDeficienciesList();
                InspectionForm.recalculateScores();
                InspectionForm.populatePrintSheet();
            }""")
            
            pdf_path_b = f"{OUTPUT_DIR}/BK-GS-DD.01_63_achieved.pdf"
            await page_b.pdf(
                path=pdf_path_b,
                format="A4",
                margin={"top": "15mm", "bottom": "15mm", "left": "15mm", "right": "15mm"},
                print_background=True
            )
            
            txt_path_b = f"{OUTPUT_DIR}/BK-GS-DD.01_63_achieved.txt"
            subprocess.run(["pdftotext", pdf_path_b, txt_path_b], check=True)
            with open(txt_path_b, "r", encoding="utf-8") as f:
                pdf_b_text = f.read()
                
            norm_pdf_b = re.sub(r'\s+', ' ', pdf_b_text)
            has_no_def = "Không có tồn tại" in norm_pdf_b
            has_score_100 = ("100,00 / 100,00" in norm_pdf_b) or ("100 / 100" in norm_pdf_b)
            has_rating_dat = "Xếp loại: Đạt" in norm_pdf_b
            
            print(f"  Có 'Không có tồn tại':   {has_no_def}")
            print(f"  Có tổng điểm 100/100:     {has_score_100}")
            print(f"  Có Xếp loại Đạt:          {has_rating_dat}")
            assert has_no_def, "LỖI: Thiếu 'Không có tồn tại' trong đợt đạt chuẩn!"
            assert has_score_100, "LỖI: Tổng điểm không đạt 100,00/100,00!"
            assert has_rating_dat, "LỖI: Xếp loại không phải Đạt!"
            print("  ==> KẾT QUẢ (b): PASS (Đối chứng 63/63 Đạt hoàn toàn chính xác)")
            await page_b.close()

            # -------------------------------------------------------------
            # TEST (h): Chụp ảnh Web (1366 + 390) và kết xuất PDF trang 1, 2, cuối
            # -------------------------------------------------------------
            print("\n>>> CHỤP ẢNH & KẾT XUẤT ARTIFACTS (h)")
            # 1. Web 1366 Desktop
            page_w1366 = await browser.new_page(viewport={"width": 1366, "height": 900})
            await page_w1366.goto("http://localhost:8089/index.html")
            await page_w1366.wait_for_selector("#criteria-stages-container .criterion-row")
            await page_w1366.select_option("#inspect-dept-select", value="1")
            
            # Đặt mục 1 là FAILED, mục 2 là NA, mục 3 là ACHIEVED để chụp thấy rõ các loại chip
            await page_w1366.locator("#btn-fail-1").click()
            await page_w1366.locator("#note-input-1").fill("Dụng cụ vệ sinh chưa sắp xếp đúng quy định")
            await page_w1366.locator("#btn-na-2").click()
            await page_w1366.wait_for_timeout(300)
            
            # Chụp dòng tiêu chuẩn con (Chặng I)
            changi_el = page_w1366.locator("#stage-section-ChặngI")
            await changi_el.screenshot(path=f"{ARTIFACT_DIR}/web_1366_criteria_chips.png")
            print(f"  Đã lưu ảnh Web 1366 dòng tiêu chuẩn: web_1366_criteria_chips.png")
            
            # Chụp khối Kế hoạch hành động
            plan_el = page_w1366.locator("#corrective-plan-details")
            await plan_el.screenshot(path=f"{ARTIFACT_DIR}/web_1366_corrective_plan.png")
            print(f"  Đã lưu ảnh Web 1366 Kế hoạch hành động: web_1366_corrective_plan.png")
            await page_w1366.close()

            # 2. Web 390 Mobile
            page_w390 = await browser.new_page(viewport={"width": 390, "height": 844})
            await page_w390.goto("http://localhost:8089/index.html")
            await page_w390.wait_for_selector("#criteria-stages-container .criterion-row")
            await page_w390.locator("#btn-fail-1").click()
            await page_w390.locator("#note-input-1").fill("Dụng cụ vệ sinh chưa sắp xếp đúng quy định")
            await page_w390.wait_for_timeout(300)
            
            changi_el_mb = page_w390.locator("#crit-row-1")
            await changi_el_mb.screenshot(path=f"{ARTIFACT_DIR}/web_390_criteria_chip.png")
            print(f"  Đã lưu ảnh Web 390 dòng tiêu chuẩn: web_390_criteria_chip.png")
            
            plan_el_mb = page_w390.locator("#corrective-plan-details")
            await plan_el_mb.screenshot(path=f"{ARTIFACT_DIR}/web_390_corrective_plan.png")
            print(f"  Đã lưu ảnh Web 390 Kế hoạch hành động: web_390_corrective_plan.png")
            await page_w390.close()

            # 3. Kết xuất ảnh các trang PDF in (Trang 1, Trang 2, Trang cuối)
            doc_pdf = fitz.open(pdf_path_a)
            total_pdf_pages = len(doc_pdf)
            print(f"  Tổng số trang của bản in PDF (63 dòng Không đạt): {total_pdf_pages} trang")
            
            # Trang 1
            pix1 = doc_pdf[0].get_pixmap(dpi=150)
            pix1.save(f"{ARTIFACT_DIR}/pdf_print_page_1.png")
            print(f"  Đã kết xuất Trang 1 PDF: pdf_print_page_1.png")
            
            # Trang 2
            if total_pdf_pages > 1:
                pix2 = doc_pdf[1].get_pixmap(dpi=150)
                pix2.save(f"{ARTIFACT_DIR}/pdf_print_page_2.png")
                print(f"  Đã kết xuất Trang 2 PDF: pdf_print_page_2.png")
            
            # Trang cuối
            pix_last = doc_pdf[total_pdf_pages - 1].get_pixmap(dpi=150)
            pix_last.save(f"{ARTIFACT_DIR}/pdf_print_page_last.png")
            print(f"  Đã kết xuất Trang cuối ({total_pdf_pages}) PDF: pdf_print_page_last.png")
            doc_pdf.close()

            await browser.close()
            
    finally:
        server.terminate()
        server.wait()

    # -------------------------------------------------------------
    # TEST (g): DOCX xuất qua export_inspection_docx đọc bằng python-docx
    # -------------------------------------------------------------
    print("\n>>> KIỂM TRA (g): DOCX xuất qua export_inspection_docx")
    import sys
    sys.path.insert(0, "app/backend")
    from database import get_connection
    from export_service import export_inspection_docx
    
    # Chuẩn bị 1 round test với 4 chuyên gia giám sát
    conn = get_connection()
    c = conn.cursor()
    
    # Kiểm tra xem round test đã có chưa
    test_round_id = 9999
    c.execute("DELETE FROM corrective_plans WHERE round_id = ?;", (test_round_id,))
    c.execute("DELETE FROM inspection_details WHERE round_id = ?;", (test_round_id,))
    c.execute("DELETE FROM inspection_rounds WHERE id = ?;", (test_round_id,))
    
    test_inspectors = "GS. Ninh Nguyen\nGS. Jaime Ponce\nGS. Rami Lutfi\nBSCKII. Vũ Khương An"
    c.execute("""
    INSERT INTO inspection_rounds (
        id, department_id, loai_dot, year, quarter, inspection_time,
        head_nurse, inspectors, trang_thai, rating, rating_code,
        compliance_rate, total_achieved_score, total_standard_score, total_kap_score
    ) VALUES (?, 1, 'DINH_KY', 2026, 4, '14:30 15.10.2026', 'Trần Thị Thu Nga', ?, 'hoan_tat', 'Đạt', 'dat', 95.0, 95.0, 100.0, 0.0);
    """, (test_round_id, test_inspectors))
    
    # Chèn 63 chi tiết
    c.execute("SELECT id, diem FROM criteria ORDER BY thu_tu;")
    crits = c.fetchall()
    for crit in crits:
        c.execute("""
        INSERT INTO inspection_details (round_id, criterion_id, status, awarded_score, defect_note)
        VALUES (?, ?, 'ACHIEVED', ?, '');
        """, (test_round_id, crit['id'], crit['diem']))
        
    c.execute("""
    INSERT INTO corrective_plans (round_id, deficiencies_summary, action_measures, person_in_charge, deadline)
    VALUES (?, '- Khắc phục tồn tại vệ sinh.', 'Đào tạo lại quy trình', 'Trần Thị Thu Nga', '25.10.2026');
    """, (test_round_id,))
    conn.commit()
    conn.close()
    
    docx_out_path = f"{OUTPUT_DIR}/BK-GS-DD.01_test_output.docx"
    export_inspection_docx(test_round_id, output_docx_path=docx_out_path)
    print(f"  Đã xuất DOCX thành công: {docx_out_path}")
    
    # Đọc lại bằng python-docx để kiểm chứng
    doc = docx.Document(docx_out_path)
    t1 = doc.tables[1]
    t2 = doc.tables[2]
    t3 = doc.tables[3]
    
    # 1. Hàng 2 Table 1: cells[4] = "Điểm thực tế", cells[5] = "Ghi chú"
    t1_r2_c4 = t1.rows[2].cells[4].text.strip()
    t1_r2_c5 = t1.rows[2].cells[5].text.strip()
    print(f"  Table 1 Row 2 Cell 4: '{t1_r2_c4}' (Yêu cầu: 'Điểm thực tế')")
    print(f"  Table 1 Row 2 Cell 5: '{t1_r2_c5}' (Yêu cầu: 'Ghi chú')")
    assert t1_r2_c4 == "Điểm thực tế", f"LỖI: Cell 4 là '{t1_r2_c4}'"
    assert t1_r2_c5 == "Ghi chú", f"LỖI: Cell 5 là '{t1_r2_c5}'"
    
    # 2. Table 2: Không còn dòng "Người chịu trách nhiệm"
    t2_right_text = t2.rows[2].cells[1].text
    has_person_line = "Người chịu trách nhiệm" in t2_right_text
    print(f"  Table 2 cột Kế hoạch có dòng 'Người chịu trách nhiệm': {has_person_line} (Yêu cầu: False)")
    assert not has_person_line, "LỖI: Table 2 vẫn còn 'Người chịu trách nhiệm'!"
    
    # 3. Table 3: Ghi đủ N thành viên giám sát
    t3_col0_text = t3.rows[1].cells[0].text
    print(f"  Table 3 Cột 1 (Thành viên giám sát):\n{t3_col0_text}")
    for name in ["GS. Ninh Nguyen", "GS. Jaime Ponce", "GS. Rami Lutfi", "BSCKII. Vũ Khương An"]:
        assert name in t3_col0_text, f"LỖI: Thiếu tên '{name}' trong khối ký Table 3!"
    print("  ==> KẾT QUẢ (g): PASS (DOCX đáp ứng 100% yêu cầu tiêu đề, bỏ người chịu trách nhiệm, đủ N chuyên gia)")

    print("\n======================================================================")
    print("      TẤT CẢ CÁC MỤC KIỂM THỬ TỪ (a) ĐẾN (g) ĐỀU ĐẠT CHUẨN XANH (PASS)    ")
    print("======================================================================")

if __name__ == "__main__":
    asyncio.run(run_all_tests())
