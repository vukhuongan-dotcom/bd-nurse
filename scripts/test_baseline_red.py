import asyncio
import os
import subprocess
import time
from playwright.async_api import async_playwright

async def run_baseline_tests():
    print("=== RUNNING BASELINE (RED) TESTS ON CURRENT CODEBASE ===")
    
    # Start local http server on port 8089 serving _site
    server = subprocess.Popen(["python3", "-m", "http.server", "8089", "--directory", "_site"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    
    results = {}
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto("http://localhost:8089/index.html")
            await page.wait_for_selector("#criteria-stages-container .criterion-row")
            
            # --- Check (d): Bounding boxes of title and caption ---
            print("\n--- Check (d): Bounding box overlap ---")
            plan_heading = await page.locator("#corrective-plan-details .card-heading").bounding_box()
            plan_caption = await page.locator("#corrective-plan-details .card-caption").bounding_box()
            overlap_plan = (plan_heading["y"] + plan_heading["height"]) > plan_caption["y"]
            print(f"Plan Heading bottom: {plan_heading['y'] + plan_heading['height']}, Caption top: {plan_caption['y']}, Overlap: {overlap_plan}")
            
            # Switch to Dashboard tab to check
            await page.locator("#tab-btn-dashboard").click()
            await page.wait_for_selector(".dashboard-card-ranking")
            dash_heading = await page.locator(".dashboard-card-ranking .card-heading").bounding_box()
            dash_caption = await page.locator(".dashboard-card-ranking .card-caption").bounding_box()
            overlap_dash = (dash_heading["y"] + dash_heading["height"]) > dash_caption["y"]
            print(f"Dashboard Heading bottom: {dash_heading['y'] + dash_heading['height']}, Caption top: {dash_caption['y']}, Overlap: {overlap_dash}")
            results["d_no_overlap"] = not (overlap_plan or overlap_dash)
            
            # Switch back to Inspection tab
            await page.locator("#tab-btn-inspection").click()
            
            # --- Check (e): Visible elements #inspect-inspectors & #corrective-person ---
            print("\n--- Check (e): Visibility of #inspect-inspectors and #corrective-person ---")
            inspectors_vis = await page.locator("#inspect-inspectors").is_visible()
            person_vis = await page.locator("#corrective-person").is_visible()
            print(f"#inspect-inspectors visible: {inspectors_vis} (Expect False)")
            print(f"#corrective-person visible: {person_vis} (Expect False)")
            results["e_elements_hidden"] = (not inspectors_vis) and (not person_vis)
            
            # --- Check (f): Chip 'Điểm thực tế' exists and updates ---
            print("\n--- Check (f): Chip 'Điểm thực tế' presence & update ---")
            actual_chips_count = await page.locator(".criterion-actual-chip").count()
            print(f".criterion-actual-chip count: {actual_chips_count} (Expect 63)")
            results["f_actual_chip_present"] = actual_chips_count == 63
            
            # --- Check (a): Print PDF with 63/63 Failed ---
            print("\n--- Check (a): PDF print 63/63 Failed ---")
            # Select department 1
            await page.select_option("#inspect-dept-select", value="1")
            
            # Click Fail for all 63 criteria and enter 60-char defect note
            # Execute in page
            await page.evaluate("""() => {
                InspectionForm.criteria.forEach(c => {
                    InspectionForm.scoresState[c.id] = {
                        status: 'FAILED',
                        awarded_score: 0.0,
                        defect_note: 'Lỗi quy trình chưa tuân thủ đúng bảng kiểm giám sát 12345678'
                    };
                    InspectionForm.updateCriterionUI(c.id);
                });
                InspectionForm.recalculateScores();
            }""")
            
            # Generate PDF
            os.makedirs("/tmp/test_output", exist_ok=True)
            pdf_path_63_fail = "/tmp/test_output/test_63_fail.pdf"
            await page.pdf(path=pdf_path_63_fail, format="A4", margin={"top": "15mm", "bottom": "15mm", "left": "15mm", "right": "15mm"}, print_background=True)
            
            # Run pdftotext
            txt_path_63_fail = "/tmp/test_output/test_63_fail.txt"
            subprocess.run(["pdftotext", pdf_path_63_fail, txt_path_63_fail])
            with open(txt_path_63_fail, "r", encoding="utf-8") as f:
                pdf_text = f.read()
            
            has_print_sheet = "#print-sheet" in await page.content() and (await page.locator("#print-sheet").count() > 0)
            has_diem_thuc_te = "Điểm thực tế" in pdf_text
            has_sig_1 = "THÀNH VIÊN GIÁM SÁT" in pdf_text
            has_sig_2 = "ĐIỀU DƯỠNG TRƯỞNG KHOA" in pdf_text
            has_sig_3 = "TRƯỞNG PHÒNG ĐIỀU DƯỠNG" in pdf_text
            fail_lines_count = pdf_text.count("Lỗi quy trình chưa tuân thủ đúng bảng kiểm giám sát")
            
            print(f"#print-sheet element exists in DOM: {has_print_sheet}")
            print(f"PDF contains 'Điểm thực tế': {has_diem_thuc_te}")
            print(f"PDF contains 3 signatures: {has_sig_1 and has_sig_2 and has_sig_3}")
            print(f"Deficiency lines count in PDF: {fail_lines_count} (Expect 63)")
            results["a_pdf_63_fail"] = (has_diem_thuc_te and has_sig_1 and has_sig_2 and has_sig_3 and fail_lines_count == 63)
            
            # --- Check (c): UI words in PDF ---
            print("\n--- Check (c): UI words in PDF ---")
            ui_words = ["Hoàn tất kiểm tra", "Lưu nháp", "Chấm điểm"]
            found_ui_words = [w for w in ui_words if w in pdf_text]
            print(f"Found UI words in PDF: {found_ui_words} (Expect empty)")
            results["c_no_ui_words"] = len(found_ui_words) == 0
            
            await browser.close()
            
    finally:
        server.terminate()
        server.wait()
        
    print("\n=== BASELINE TEST SUMMARY ===")
    for k, v in results.items():
        status = "PASS (GREEN)" if v else "FAIL (RED)"
        print(f"  {k}: {status}")

if __name__ == "__main__":
    asyncio.run(run_baseline_tests())
