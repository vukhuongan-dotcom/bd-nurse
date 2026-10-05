"""
Test Suite for Editable Score Scroll Picker & Automatic Status Evaluation
BD-NURSE (BK-GS-ĐD.01)
"""

import asyncio
from playwright.async_api import async_playwright

async def run_tests():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1366, "height": 900})
        
        print("=== TEST SUITE: EDITABLE SCORE SCROLL & AUTO STATUS ===")
        
        # Load local site
        url = "file:///tmp/nurse_app/_site/index.html"
        await page.goto(url, wait_until="networkidle")
        await page.wait_for_timeout(1000)
        
        # 1. Kiểm tra 63 select tồn tại
        select_count = await page.locator(".criterion-actual-select").count()
        print(f"1. Tổng số thẻ select điểm thực tế: {select_count} (Kỳ vọng: 63)")
        assert select_count == 63, f"Expected 63 selects, got {select_count}"
        
        # 2. Kiểm tra giá trị ban đầu mục 1 (max 1.00đ)
        select_1 = page.locator("#crit-actual-chip-1")
        val_initial = await select_1.input_value()
        class_initial = await select_1.get_attribute("class")
        print(f"2. Mục 1 ban đầu: Value = '{val_initial}', Class = '{class_initial}'")
        assert val_initial == "1.00", f"Expected 1.00, got {val_initial}"
        assert "status-achieved" in class_initial, "Expected status-achieved"
        
        # 3. Chọn điểm 0.75 trên mục 1 (thấp hơn điểm chuẩn -> Tự động KHÔNG ĐẠT)
        await select_1.select_option("0.75")
        await page.wait_for_timeout(500)
        
        val_after_75 = await select_1.input_value()
        class_after_75 = await select_1.get_attribute("class")
        btn_fail_active = await page.locator("#btn-fail-1").get_attribute("class")
        row_class = await page.locator("#crit-row-1").get_attribute("class")
        total_score_text = await page.locator("#desktop-score-points").inner_text()
        deficiencies_val = await page.locator("#corrective-deficiencies").input_value()
        
        print(f"3. Sau khi chọn 0.75đ:")
        print(f"   - Value: {val_after_75} | Class: {class_after_75}")
        print(f"   - Nút Không đạt active: {'active' in btn_fail_active}")
        print(f"   - Viền đỏ row-failed: {'row-failed' in row_class}")
        print(f"   - Tổng điểm đạt: '{total_score_text}' (Kỳ vọng: 99,75 / 100,00đ)")
        print(f"   - Tồn tại ghi nhận chứa '[0,75/1,00đ]': {'[0,75/1,00đ]' in deficiencies_val}")
        
        assert val_after_75 == "0.75"
        assert "status-failed" in class_after_75
        assert "active" in btn_fail_active
        assert "row-failed" in row_class
        assert "99,75" in total_score_text
        assert "[0,75/1,00đ]" in deficiencies_val
        
        # 4. Chọn lại điểm 1.00 trên mục 1 (điểm tối đa -> Tự động ĐẠT)
        await select_1.select_option("1.00")
        await page.wait_for_timeout(500)
        
        val_after_1 = await select_1.input_value()
        class_after_1 = await select_1.get_attribute("class")
        btn_pass_active = await page.locator("#btn-pass-1").get_attribute("class")
        row_class_after_1 = await page.locator("#crit-row-1").get_attribute("class")
        total_score_after_1 = await page.locator("#desktop-score-points").inner_text()
        
        print(f"4. Sau khi chọn lại 1.00đ:")
        print(f"   - Value: {val_after_1} | Class: {class_after_1}")
        print(f"   - Nút Đạt active: {'active' in btn_pass_active}")
        print(f"   - Bỏ viền đỏ row-failed: {'row-failed' not in row_class_after_1}")
        print(f"   - Tổng điểm đạt trở lại: '{total_score_after_1}' (Kỳ vọng: 100,00 / 100,00đ)")
        
        assert val_after_1 == "1.00"
        assert "status-achieved" in class_after_1
        assert "active" in btn_pass_active
        assert "row-failed" not in row_class_after_1
        assert "100,00" in total_score_after_1
        
        # 5. Bấm nút 'Không đạt' -> Select tự động nhảy về 0.00
        await page.locator("#btn-fail-1").click()
        await page.wait_for_timeout(300)
        val_btn_fail = await select_1.input_value()
        class_btn_fail = await select_1.get_attribute("class")
        print(f"5. Sau khi bấm nút 'Không đạt': Value = '{val_btn_fail}', Class = '{class_btn_fail}'")
        assert val_btn_fail == "0.00"
        assert "status-failed" in class_btn_fail
        
        # 6. Bấm nút 'Đạt' -> Select tự động nhảy về 1.00
        await page.locator("#btn-pass-1").click()
        await page.wait_for_timeout(300)
        val_btn_pass = await select_1.input_value()
        class_btn_pass = await select_1.get_attribute("class")
        print(f"6. Sau khi bấm nút 'Đạt': Value = '{val_btn_pass}', Class = '{class_btn_pass}'")
        assert val_btn_pass == "1.00"
        assert "status-achieved" in class_btn_pass
        
        # 7. Bấm nút 'KAP' -> Select hiển thị NA
        await page.locator("#btn-na-1").click()
        await page.wait_for_timeout(300)
        val_btn_na = await select_1.input_value()
        class_btn_na = await select_1.get_attribute("class")
        print(f"7. Sau khi bấm nút 'KAP': Value = '{val_btn_na}', Class = '{class_btn_na}'")
        assert val_btn_na == "NA"
        assert "status-na" in class_btn_na
        
        # 8. Đặt lại mục 1 = 0.50đ, mục 2 = 0.25đ để chụp ảnh minh chứng
        await select_1.select_option("0.50")
        await page.locator("#crit-actual-chip-2").select_option("0.25")
        await page.wait_for_timeout(500)
        
        # Chụp ảnh Desktop
        shot_path_desktop = "/Users/khuonganvu/.gemini/antigravity/brain/dca807f9-6aa7-4e00-9992-fb4f172e2704/desktop_score_scroll_demo.png"
        await page.locator(".stage-section").first.screenshot(path=shot_path_desktop)
        print(f"8. Đã chụp ảnh Desktop: {shot_path_desktop}")
        
        # Chụp ảnh Mobile
        page_m = await browser.new_page(viewport={"width": 390, "height": 844})
        await page_m.goto(url, wait_until="networkidle")
        await page_m.wait_for_timeout(1000)
        # Chọn 0.75 trên mobile
        await page_m.locator("#crit-actual-chip-1").select_option("0.75")
        await page_m.wait_for_timeout(500)
        shot_path_mobile = "/Users/khuonganvu/.gemini/antigravity/brain/dca807f9-6aa7-4e00-9992-fb4f172e2704/mobile_score_scroll_demo.png"
        await page_m.locator("#crit-row-1").screenshot(path=shot_path_mobile)
        print(f"9. Đã chụp ảnh Mobile: {shot_path_mobile}")
        
        await browser.close()
        print("\n>>> TẤT CẢ CÁC BƯỚC KIỂM THỬ ĐỀU ĐẠT CHUẨN XANH (PASS) 100% <<<")

if __name__ == "__main__":
    asyncio.run(run_tests())
