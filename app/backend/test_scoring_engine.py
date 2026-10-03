"""
Test Suite for BD-NURSE Scoring Engine
Kiểm thử 10 kịch bản giá trị biên và an toàn lâm sàng theo Lệnh 2.
"""

import unittest
from decimal import Decimal
from scoring_engine import calculate_scores, ScoringError


class TestBDNurseScoringEngine(unittest.TestCase):

    def test_01_all_achieved(self):
        """1. Tất cả 63 dòng Đạt -> 100% (Đạt)"""
        items = [{'status': 'ACHIEVED', 'max_score': 1}] * 40 + [{'status': 'ACHIEVED', 'max_score': 2}] * 20 + [{'status': 'ACHIEVED', 'max_score': 4}] * 5 # tổng 100
        # Chuẩn hóa đúng tổng 100 điểm
        items = [{'status': 'ACHIEVED', 'max_score': 100}]
        res = calculate_scores(items)
        self.assertEqual(res['total_achieved_score'], 100)
        self.assertEqual(res['total_kap_score'], 0)
        self.assertEqual(res['effective_denominator'], 100)
        self.assertEqual(res['compliance_rate'], 100.0)
        self.assertEqual(res['rating'], 'Đạt')
        self.assertEqual(res['rating_code'], 'dat')

    def test_02_single_defect_4pts(self):
        """2. 1 dòng 4 điểm KĐ -> 96.0% (Đạt)"""
        items = [
            {'status': 'FAILED', 'max_score': 4},
            {'status': 'ACHIEVED', 'max_score': 96}
        ]
        res = calculate_scores(items)
        self.assertEqual(res['total_achieved_score'], 96)
        self.assertEqual(res['effective_denominator'], 100)
        self.assertEqual(res['compliance_rate'], 96.0)
        self.assertEqual(res['rating'], 'Đạt')

    def test_03_rounding_boundary_69_94(self):
        """3. Tỷ lệ thực 69.94% -> Làm tròn 69.9% -> KHÔNG ĐẠT"""
        # 69.94 / 100 = 3497 / 5000 -> achieved = 3497, denominator = 5000 -> 69.94%
        # Hoặc với thang 10000: đạt 6994 trên 10000 (mẫu số sau KAP)
        # Giả sử mẫu số hiệu dụng = 100, đạt = 69.94 (hoặc số điểm nguyên trên mẫu số đặc thù)
        # Ví dụ: đạt 49.6574 trên mẫu số 71 -> 49.6574/71 * 100 = 69.94%
        # Để test trực tiếp tỷ lệ: dùng mẫu số = 10000, đạt = 6994
        # Nhưng ở hàm ta dùng tổng chuẩn = 100.
        # Ví dụ: mẫu số = 73 (KAP 27 điểm), đạt 51.0562 điểm -> 51.0562/73*100 = 69.94%
        # Kiểm thử với float chính xác:
        items = [
            {'status': 'NA', 'max_score': 50}, # mẫu số = 50
            {'status': 'ACHIEVED', 'max_score': 34.97}, # 34.97 / 50 * 100 = 69.94%
            {'status': 'FAILED', 'max_score': 15.03}
        ]
        res = calculate_scores(items)
        self.assertEqual(res['compliance_rate'], 69.9)
        self.assertEqual(res['rating'], 'KHÔNG ĐẠT')
        self.assertEqual(res['rating_code'], 'khong_dat')

    def test_04_rounding_boundary_69_95(self):
        """4. Tỷ lệ thực 69.95% -> Làm tròn 70.0% -> Cần cải tiến"""
        items = [
            {'status': 'NA', 'max_score': 50}, # mẫu số = 50
            {'status': 'ACHIEVED', 'max_score': 34.975}, # 34.975 / 50 * 100 = 69.95%
            {'status': 'FAILED', 'max_score': 15.025}
        ]
        res = calculate_scores(items)
        self.assertEqual(res['compliance_rate'], 70.0)
        self.assertEqual(res['rating'], 'Cần cải tiến')
        self.assertEqual(res['rating_code'], 'can_cai_tien')

    def test_05_rounding_boundary_79_95(self):
        """5. Tỷ lệ thực 79.95% -> Làm tròn 80.0% -> Tốt / Đạt yêu cầu"""
        items = [
            {'status': 'NA', 'max_score': 50},
            {'status': 'ACHIEVED', 'max_score': 39.975}, # 39.975 / 50 * 100 = 79.95%
            {'status': 'FAILED', 'max_score': 10.025}
        ]
        res = calculate_scores(items)
        self.assertEqual(res['compliance_rate'], 80.0)
        self.assertEqual(res['rating'], 'Tốt / Đạt yêu cầu')
        self.assertEqual(res['rating_code'], 'tot')

    def test_06_rounding_boundary_89_95(self):
        """6. Tỷ lệ thực 89.95% -> Làm tròn 90.0% -> Đạt"""
        items = [
            {'status': 'NA', 'max_score': 50},
            {'status': 'ACHIEVED', 'max_score': 44.975}, # 44.975 / 50 * 100 = 89.95%
            {'status': 'FAILED', 'max_score': 5.025}
        ]
        res = calculate_scores(items)
        self.assertEqual(res['compliance_rate'], 90.0)
        self.assertEqual(res['rating'], 'Đạt')
        self.assertEqual(res['rating_code'], 'dat')

    def test_07_kap_whole_stage_iv(self):
        """7. KAP cả Chặng IV (25 điểm) -> Mẫu số hữu hiệu: 75. Đạt 68đ -> 90.7% (Đạt)"""
        # 68 / 75 * 100 = 90.6666...% -> làm tròn 90.7%
        items = [
            {'status': 'NA', 'max_score': 25}, # KAP Chặng IV
            {'status': 'ACHIEVED', 'max_score': 68},
            {'status': 'FAILED', 'max_score': 7}
        ]
        res = calculate_scores(items)
        self.assertEqual(res['total_kap_score'], 25)
        self.assertEqual(res['effective_denominator'], 75)
        self.assertEqual(res['total_achieved_score'], 68)
        self.assertEqual(res['compliance_rate'], 90.7)
        self.assertEqual(res['rating'], 'Đạt')

    def test_08_zero_denominator(self):
        """8. Mẫu số 0 (KAP toàn bộ 100 điểm) -> Bắt lỗi ScoringError chặn chốt đợt"""
        items = [{'status': 'NA', 'max_score': 100}]
        with self.assertRaises(ScoringError):
            calculate_scores(items)

    def test_09_serious_violation_override(self):
        """9. Vi phạm nghiêm trọng + Đạt 95% -> KHÔNG ĐẠT"""
        items = [
            {'status': 'ACHIEVED', 'max_score': 95},
            {'status': 'FAILED', 'max_score': 5}
        ]
        res = calculate_scores(
            items,
            is_serious_violation=True,
            serious_violation_type="Nhầm lẫn người bệnh",
            serious_violation_desc="Điều dưỡng trao nhầm hồ sơ và thuốc giữa buồng 1 và buồng 2."
        )
        self.assertEqual(res['compliance_rate'], 95.0)
        self.assertEqual(res['rating'], 'KHÔNG ĐẠT')
        self.assertEqual(res['rating_code'], 'khong_dat')
        self.assertIsNotNone(res['alert_message'])
        self.assertIn("LẬP BIÊN BẢN", res['alert_message'].upper())

    def test_10_control_no_violation(self):
        """10. Test đối chứng: Không vi phạm nghiêm trọng + Đạt 95% -> Đạt"""
        items = [
            {'status': 'ACHIEVED', 'max_score': 95},
            {'status': 'FAILED', 'max_score': 5}
        ]
        res = calculate_scores(items, is_serious_violation=False)
        self.assertEqual(res['compliance_rate'], 95.0)
        self.assertEqual(res['rating'], 'Đạt')
        self.assertEqual(res['rating_code'], 'dat')
        self.assertIsNone(res['alert_message'])


if __name__ == '__main__':
    unittest.main()
