"""
Scoring Engine for BD-NURSE (BK-GS-ĐD.01)
Hệ thống Giám sát Chất lượng Chuyên môn Điều dưỡng — Bệnh viện Bình Dân
Tuân thủ công thức tính tỷ lệ tuân thủ và thuật toán làm tròn Decimal ROUND_HALF_UP.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Tuple, Optional


class ScoringError(Exception):
    """Lỗi tính điểm hoặc mẫu số không hợp lệ."""
    pass


def calculate_scores(
    items: List[Dict[str, Any]],
    is_serious_violation: bool = False,
    serious_violation_type: Optional[str] = None,
    serious_violation_desc: Optional[str] = None
) -> Dict[str, Any]:
    total_standard = 100.0
    total_kap = 0.0
    total_achieved = 0.0

    for item in items:
        status = item.get('status', 'ACHIEVED')
        max_score = float(item.get('max_score', 0))
        
        if status == 'NA':
            total_kap += max_score
        else:
            awarded = item.get('awarded_score')
            if awarded is not None:
                awarded_val = float(awarded)
                awarded_val = max(0.0, min(awarded_val, max_score))
                total_achieved += awarded_val
            elif status == 'ACHIEVED':
                total_achieved += max_score
            elif status == 'FAILED':
                total_achieved += 0.0
            elif status == 'PARTIAL':
                total_achieved += float(item.get('awarded_score', 0.0))
            else:
                raise ScoringError(f"Trạng thái không hợp lệ: {status}")

    total_achieved_dec = Decimal(str(round(total_achieved, 4))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    total_achieved_val = float(total_achieved_dec)

    total_kap_dec = Decimal(str(round(total_kap, 4))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    total_kap_val = float(total_kap_dec)

    effective_denominator = float(Decimal(str(total_standard)) - total_kap_dec)

    if effective_denominator <= 0:
        raise ScoringError(
            "Mẫu số tính điểm bằng 0 (KAP toàn bộ tiêu chí). "
            "Không thể tính tỷ lệ tuân thủ và chặn chốt đợt kiểm tra."
        )

    rate_dec = (
        total_achieved_dec / Decimal(str(effective_denominator)) * Decimal('100')
    ).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
    
    compliance_rate = float(rate_dec)

    if is_serious_violation:
        rating = "KHÔNG ĐẠT"
        rating_code = "khong_dat"
        alert_message = (
            "⚠️ PHÁT HIỆN VI PHẠM AN TOÀN NGƯỜI BỆNH NGHIÊM TRỌNG: "
            "Bắt buộc lập biên bản và báo cáo Ban Giám đốc / Phòng Điều dưỡng theo quy chế bệnh viện!"
        )
    else:
        alert_message = None
        if compliance_rate >= 90.0:
            rating = "Đạt"
            rating_code = "dat"
        elif compliance_rate >= 80.0:
            rating = "Tốt / Đạt yêu cầu"
            rating_code = "tot"
        elif compliance_rate >= 70.0:
            rating = "Cần cải tiến"
            rating_code = "can_cai_tien"
        else:
            rating = "KHÔNG ĐẠT"
            rating_code = "khong_dat"

    deadline_action = None
    if rating == "Cần cải tiến":
        deadline_action = "Trong vòng 48 giờ (Khoa lập kế hoạch khắc phục và gửi Phòng Điều dưỡng)"
    elif rating == "KHÔNG ĐẠT":
        deadline_action = "Sau 03 - 05 ngày (Phòng Điều dưỡng tổ chức tái giám sát)"

    return {
        "total_standard_score": total_standard,
        "total_kap_score": total_kap_val,
        "effective_denominator": effective_denominator,
        "total_achieved_score": total_achieved_val,
        "compliance_rate": compliance_rate,
        "rating": rating,
        "rating_code": rating_code,
        "is_serious_violation": is_serious_violation,
        "serious_violation_type": serious_violation_type if is_serious_violation else None,
        "serious_violation_desc": serious_violation_desc if is_serious_violation else None,
        "alert_message": alert_message,
        "deadline_action": deadline_action
    }
