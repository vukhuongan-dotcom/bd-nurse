"""
FastAPI Main Application for BD-NURSE (BK-GS-ĐD.01)
Hệ thống Giám sát Chuẩn hóa, Đánh giá Thời gian thực & An toàn Chuyên môn Điều dưỡng — Bệnh viện Bình Dân
"""

import os
import json
import sqlite3
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from database import get_connection, init_db, backup_database
from scoring_engine import calculate_scores, ScoringError
from export_service import export_inspection_docx, convert_docx_to_pdf

# Khởi tạo App
app = FastAPI(
    title="BD-NURSE API",
    description="Hệ thống Giám sát Chất lượng Chuyên môn Điều dưỡng — Bệnh viện Bình Dân",
    version="2.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", Path(__file__).resolve().parent.parent.parent))
FRONTEND_DIR = PROJECT_ROOT / "app" / "frontend"
STATIC_DIR = PROJECT_ROOT / "app" / "static"


# Pydantic Models
class CriterionScoreInput(BaseModel):
    criterion_id: int
    status: str = Field("ACHIEVED", description="ACHIEVED, PARTIAL, FAILED, NA")
    awarded_score: Optional[float] = None
    defect_note: Optional[str] = ""


class CorrectivePlanInput(BaseModel):
    deficiencies_summary: Optional[str] = ""
    action_measures: Optional[str] = ""
    person_in_charge: Optional[str] = ""
    deadline: Optional[str] = ""


class InspectionCreateInput(BaseModel):
    department_id: int
    loai_dot: str = Field("DINH_KY", description="DINH_KY, DOT_XUAT, TAI_GIAM_SAT")
    dot_goc_id: Optional[int] = None
    quarter: int = Field(..., ge=1, le=4)
    year: int = Field(..., ge=2020)
    inspection_time: str
    head_nurse: str
    inspectors: str
    is_serious_violation: bool = False
    serious_violation_type: Optional[str] = None
    serious_violation_desc: Optional[str] = None
    trang_thai: str = Field("hoan_tat", description="nhap, hoan_tat")
    details: List[CriterionScoreInput]
    corrective_plan: Optional[CorrectivePlanInput] = None


class InspectionUpdateInput(BaseModel):
    loai_dot: Optional[str] = None
    quarter: Optional[int] = None
    year: Optional[int] = None
    inspection_time: Optional[str] = None
    head_nurse: Optional[str] = None
    inspectors: Optional[str] = None
    is_serious_violation: Optional[bool] = None
    serious_violation_type: Optional[str] = None
    serious_violation_desc: Optional[str] = None
    trang_thai: Optional[str] = None
    unlock_reason: Optional[str] = None
    details: Optional[List[CriterionScoreInput]] = None
    corrective_plan: Optional[CorrectivePlanInput] = None


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def healthcheck():
    return {
        "status": "healthy",
        "app": "BD-NURSE",
        "version": "2.0.0",
        "timestamp": datetime.datetime.now().isoformat()
    }


# 1. Danh mục khoa
@app.get("/api/departments")
def get_departments():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM departments ORDER BY id ASC;")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    for r in rows:
        try:
            r['kap_preset'] = json.loads(r.get('kap_preset_json', '[]'))
        except Exception:
            r['kap_preset'] = []
    return rows


# 2. Danh mục 63 tiêu chuẩn con
@app.get("/api/criteria")
def get_criteria():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM criteria ORDER BY thu_tu ASC;")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


# 3. Lấy danh sách đợt kiểm tra
@app.get("/api/inspections")
def list_inspections(
    quarter: Optional[int] = None,
    year: Optional[int] = None,
    department_id: Optional[int] = None,
    loai_dot: Optional[str] = None,
    trang_thai: Optional[str] = None
):
    conn = get_connection()
    c = conn.cursor()
    
    query = """
    SELECT r.*, d.name as dept_name, d.code as dept_code, d.block as dept_block
    FROM inspection_rounds r
    JOIN departments d ON r.department_id = d.id
    WHERE r.deleted_at IS NULL
    """
    params = []
    
    if quarter is not None:
        query += " AND r.quarter = ?"
        params.append(quarter)
    if year is not None:
        query += " AND r.year = ?"
        params.append(year)
    if department_id is not None:
        query += " AND r.department_id = ?"
        params.append(department_id)
    if loai_dot:
        query += " AND r.loai_dot = ?"
        params.append(loai_dot)
    if trang_thai:
        query += " AND r.trang_thai = ?"
        params.append(trang_thai)
        
    query += " ORDER BY r.year DESC, r.quarter DESC, r.id DESC;"
    
    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


# 4. Chi tiết 1 đợt kiểm tra
@app.get("/api/inspections/{round_id}")
def get_inspection_detail(round_id: int):
    conn = get_connection()
    c = conn.cursor()
    
    c.execute("""
    SELECT r.*, d.name as dept_name, d.code as dept_code, d.block as dept_block
    FROM inspection_rounds r
    JOIN departments d ON r.department_id = d.id
    WHERE r.id = ? AND r.deleted_at IS NULL;
    """, (round_id,))
    round_row = c.fetchone()
    if not round_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt kiểm tra")
        
    round_data = dict(round_row)
    
    # 63 dòng con
    c.execute("""
    SELECT d.*, cr.chang, cr.muc_stt, cr.muc_ten, cr.noi_dung, cr.diem, cr.thu_tu, cr.template_row
    FROM inspection_details d
    JOIN criteria cr ON d.criterion_id = cr.id
    WHERE d.round_id = ?
    ORDER BY cr.thu_tu ASC;
    """, (round_id,))
    round_data['details'] = [dict(r) for r in c.fetchall()]
    
    # Kế hoạch khắc phục
    c.execute("SELECT * FROM corrective_plans WHERE round_id = ?;", (round_id,))
    plan_row = c.fetchone()
    round_data['corrective_plan'] = dict(plan_row) if plan_row else None
    
    conn.close()
    return round_data


# 5. Tạo mới đợt kiểm tra
@app.post("/api/inspections")
def create_inspection(payload: InspectionCreateInput):
    conn = get_connection()
    c = conn.cursor()
    
    # Lấy thông tin điểm của tất cả tiêu chuẩn
    c.execute("SELECT id, diem FROM criteria;")
    criteria_map = {r['id']: r['diem'] for r in c.fetchall()}
    
    # Chuẩn bị dữ liệu tính điểm
    scoring_items = []
    for d in payload.details:
        if d.criterion_id not in criteria_map:
            conn.close()
            raise HTTPException(status_code=400, detail=f"Mã tiêu chuẩn con không hợp lệ: {d.criterion_id}")
        scoring_items.append({
            'status': d.status,
            'max_score': criteria_map[d.criterion_id],
            'awarded_score': d.awarded_score
        })
        
    try:
        score_res = calculate_scores(
            scoring_items,
            is_serious_violation=payload.is_serious_violation,
            serious_violation_type=payload.serious_violation_type,
            serious_violation_desc=payload.serious_violation_desc
        )
    except ScoringError as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))
        
    # Tính hạn tự động
    han_khac_phuc = None
    han_tai_giam_sat = None
    now_dt = datetime.datetime.now()
    if score_res['rating'] == 'Cần cải tiến':
        han_khac_phuc = (now_dt + datetime.timedelta(hours=48)).strftime("%d.%m.%Y %H:%M")
    elif score_res['rating'] == 'KHÔNG ĐẠT':
        han_tai_giam_sat = (now_dt + datetime.timedelta(days=4)).strftime("%d.%m.%Y")
        
    # Lưu bảng inspection_rounds
    c.execute("""
    INSERT INTO inspection_rounds (
        department_id, loai_dot, dot_goc_id, quarter, year,
        inspection_time, head_nurse, inspectors,
        total_standard_score, total_kap_score, total_achieved_score,
        compliance_rate, rating, rating_code,
        is_serious_violation, serious_violation_type, serious_violation_desc,
        han_khac_phuc, han_tai_giam_sat, trang_thai
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        payload.department_id, payload.loai_dot, payload.dot_goc_id,
        payload.quarter, payload.year, payload.inspection_time,
        payload.head_nurse, payload.inspectors,
        score_res['total_standard_score'], score_res['total_kap_score'],
        score_res['total_achieved_score'], score_res['compliance_rate'],
        score_res['rating'], score_res['rating_code'],
        int(payload.is_serious_violation), payload.serious_violation_type, payload.serious_violation_desc,
        han_khac_phuc, han_tai_giam_sat, payload.trang_thai
    ))
    round_id = c.lastrowid
    
    # Lưu 63 inspection_details
    for d in payload.details:
        max_s = float(criteria_map[d.criterion_id])
        if d.status == 'NA':
            status = 'NA'
            awarded = 0.0
        else:
            awarded = d.awarded_score if d.awarded_score is not None else (max_s if d.status == 'ACHIEVED' else 0.0)
            awarded = max(0.0, min(float(awarded), max_s))
            # Quy tắc auto: Full điểm -> Đạt, < điểm chuẩn -> Không đạt
            status = 'ACHIEVED' if awarded >= max_s else 'FAILED'
            
        c.execute("""
        INSERT INTO inspection_details (round_id, criterion_id, status, awarded_score, defect_note)
        VALUES (?, ?, ?, ?, ?);
        """, (round_id, d.criterion_id, status, awarded, d.defect_note or ''))
        
    # Lưu kế hoạch khắc phục
    if payload.corrective_plan:
        c.execute("""
        INSERT INTO corrective_plans (round_id, deficiencies_summary, action_measures, person_in_charge, deadline)
        VALUES (?, ?, ?, ?, ?);
        """, (
            round_id,
            payload.corrective_plan.deficiencies_summary or '',
            payload.corrective_plan.action_measures or '',
            payload.corrective_plan.person_in_charge or payload.head_nurse,
            payload.corrective_plan.deadline or ''
        ))
        
    conn.commit()
    conn.close()
    
    # Kích hoạt sao lưu snapshot ngầm
    try:
        backup_database()
    except Exception:
        pass
        
    return {"id": round_id, "message": "Tạo đợt kiểm tra thành công", "result": score_res}


# 6. Cập nhật đợt kiểm tra
@app.put("/api/inspections/{round_id}")
def update_inspection(round_id: int, payload: InspectionUpdateInput):
    conn = get_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM inspection_rounds WHERE id = ? AND deleted_at IS NULL;", (round_id,))
    current = c.fetchone()
    if not current:
        conn.close()
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt kiểm tra")
        
    if current['trang_thai'] == 'da_khoa' and not payload.unlock_reason:
        conn.close()
        raise HTTPException(status_code=403, detail="Đợt kiểm tra đã bị khóa. Bắt buộc nhập lý do mở khóa để chỉnh sửa.")
        
    # Lấy thông tin điểm tiêu chuẩn nếu có cập nhật details
    if payload.details:
        c.execute("SELECT id, diem FROM criteria;")
        criteria_map = {r['id']: r['diem'] for r in c.fetchall()}
        
        scoring_items = []
        for d in payload.details:
            scoring_items.append({
                'status': d.status,
                'max_score': criteria_map.get(d.criterion_id, 0)
            })
            
        is_serious = payload.is_serious_violation if payload.is_serious_violation is not None else bool(current['is_serious_violation'])
        serious_type = payload.serious_violation_type if payload.serious_violation_type is not None else current['serious_violation_type']
        serious_desc = payload.serious_violation_desc if payload.serious_violation_desc is not None else current['serious_violation_desc']
        
        try:
            score_res = calculate_scores(
                scoring_items,
                is_serious_violation=is_serious,
                serious_violation_type=serious_type,
                serious_violation_desc=serious_desc
            )
        except ScoringError as e:
            conn.close()
            raise HTTPException(status_code=400, detail=str(e))
            
        c.execute("""
        UPDATE inspection_rounds SET
            total_standard_score = ?,
            total_kap_score = ?,
            total_achieved_score = ?,
            compliance_rate = ?,
            rating = ?,
            rating_code = ?,
            is_serious_violation = ?,
            serious_violation_type = ?,
            serious_violation_desc = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
        """, (
            score_res['total_standard_score'], score_res['total_kap_score'],
            score_res['total_achieved_score'], score_res['compliance_rate'],
            score_res['rating'], score_res['rating_code'],
            int(is_serious), serious_type, serious_desc,
            round_id
        ))
        
        # Cập nhật chi tiết
        c.execute("DELETE FROM inspection_details WHERE round_id = ?;", (round_id,))
        for d in payload.details:
            awarded = criteria_map[d.criterion_id] if d.status == 'ACHIEVED' else 0
            c.execute("""
            INSERT INTO inspection_details (round_id, criterion_id, status, awarded_score, defect_note)
            VALUES (?, ?, ?, ?, ?);
            """, (round_id, d.criterion_id, d.status, awarded, d.defect_note or ''))
            
    # Cập nhật các trường thông tin chung
    updates = []
    vals = []
    if payload.inspection_time is not None:
        updates.append("inspection_time = ?"); vals.append(payload.inspection_time)
    if payload.head_nurse is not None:
        updates.append("head_nurse = ?"); vals.append(payload.head_nurse)
    if payload.inspectors is not None:
        updates.append("inspectors = ?"); vals.append(payload.inspectors)
    if payload.trang_thai is not None:
        updates.append("trang_thai = ?"); vals.append(payload.trang_thai)
    if payload.unlock_reason is not None:
        updates.append("unlock_reason = ?"); vals.append(payload.unlock_reason)
        
    if updates:
        vals.append(round_id)
        c.execute(f"UPDATE inspection_rounds SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;", vals)
        
    # Cập nhật kế hoạch khắc phục
    if payload.corrective_plan:
        c.execute("""
        INSERT INTO corrective_plans (round_id, deficiencies_summary, action_measures, person_in_charge, deadline)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            deficiencies_summary = excluded.deficiencies_summary,
            action_measures = excluded.action_measures,
            person_in_charge = excluded.person_in_charge,
            deadline = excluded.deadline;
        """, (
            round_id,
            payload.corrective_plan.deficiencies_summary or '',
            payload.corrective_plan.action_measures or '',
            payload.corrective_plan.person_in_charge or '',
            payload.corrective_plan.deadline or ''
        ))
        
    conn.commit()
    conn.close()
    return {"message": "Cập nhật thành công"}


# 7. Xóa mềm đợt kiểm tra
@app.delete("/api/inspections/{round_id}")
def delete_inspection(round_id: int):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE inspection_rounds SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?;", (round_id,))
    conn.commit()
    conn.close()
    return {"message": "Đã xóa đợt kiểm tra"}


# 8. Khóa / Mở khóa đợt kiểm tra
@app.post("/api/inspections/{round_id}/lock")
def lock_inspection(round_id: int):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE inspection_rounds SET trang_thai = 'da_khoa', updated_at = CURRENT_TIMESTAMP WHERE id = ?;", (round_id,))
    conn.commit()
    conn.close()
    return {"message": "Đã khóa đợt kiểm tra chính thức"}


@app.post("/api/inspections/{round_id}/unlock")
def unlock_inspection(round_id: int, reason: str = Query(..., description="Lý do mở khóa")):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    UPDATE inspection_rounds SET
        trang_thai = 'hoan_tat',
        unlock_reason = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
    """, (reason, round_id))
    conn.commit()
    conn.close()
    return {"message": "Đã mở khóa đợt kiểm tra"}


# 9. Xuất DOCX
@app.get("/api/inspections/{round_id}/export-docx")
def download_docx(round_id: int):
    try:
        path = export_inspection_docx(round_id)
        filename = os.path.basename(path)
        return FileResponse(
            path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất DOCX: {e}")


# 10. Xuất PDF
@app.get("/api/inspections/{round_id}/export-pdf")
def download_pdf(round_id: int):
    try:
        docx_path = export_inspection_docx(round_id)
        pdf_path = convert_docx_to_pdf(docx_path)
        filename = os.path.basename(pdf_path)
        return FileResponse(
            pdf_path,
            filename=filename,
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất PDF: {e}")


# 11. Dashboard Thống kê Quý / Năm
@app.get("/api/stats/dashboard")
def get_dashboard_stats(
    quarter: Optional[int] = Query(None, ge=1, le=4),
    year: int = Query(2026, ge=2020)
):
    conn = get_connection()
    c = conn.cursor()
    
    # 1. Tổng số khoa
    c.execute("SELECT COUNT(*) FROM departments;")
    total_depts = c.fetchone()[0]
    
    # 2. Các đợt định kỳ hoàn tất trong quý/năm
    query_rounds = """
    SELECT r.*, d.name as dept_name, d.code as dept_code, d.block as dept_block
    FROM inspection_rounds r
    JOIN departments d ON r.department_id = d.id
    WHERE r.deleted_at IS NULL AND r.year = ?
    """
    params = [year]
    if quarter:
        query_rounds += " AND r.quarter = ?"
        params.append(quarter)
        
    c.execute(query_rounds, params)
    rounds = [dict(r) for r in c.fetchall()]
    
    # Lọc lấy đợt định kỳ gần nhất của từng khoa
    periodic_by_dept = {}
    for r in rounds:
        if r['loai_dot'] == 'DINH_KY':
            dept_id = r['department_id']
            if dept_id not in periodic_by_dept or r['id'] > periodic_by_dept[dept_id]['id']:
                periodic_by_dept[dept_id] = r
                
    inspected_count = len(periodic_by_dept)
    progress_rate = round((inspected_count / total_depts * 100), 1) if total_depts else 0
    
    # Phân bố xếp loại
    rating_counts = {"dat": 0, "tot": 0, "can_cai_tien": 0, "khong_dat": 0}
    scores_sum = 0
    for r in periodic_by_dept.values():
        scores_sum += r['compliance_rate']
        code = r['rating_code']
        if code in rating_counts:
            rating_counts[code] += 1
            
    avg_compliance = round(scores_sum / inspected_count, 1) if inspected_count else 0
    
    # Bảng xếp hạng 27 khoa (theo tỷ lệ tuân thủ giảm dần)
    ranking = sorted(list(periodic_by_dept.values()), key=lambda x: x['compliance_rate'], reverse=True)
    
    # Top 5 sai sót theo dòng tiêu chuẩn con
    c.execute("""
    SELECT cr.thu_tu, cr.muc_stt, cr.muc_ten, cr.noi_dung, cr.chang,
           SUM(CASE WHEN d.status = 'FAILED' THEN 1 ELSE 0 END) as failed_count,
           SUM(CASE WHEN d.status IN ('ACHIEVED', 'FAILED') THEN 1 ELSE 0 END) as applied_count
    FROM inspection_details d
    JOIN criteria cr ON d.criterion_id = cr.id
    JOIN inspection_rounds r ON d.round_id = r.id
    WHERE r.deleted_at IS NULL AND r.year = ?
    """ + (" AND r.quarter = ?" if quarter else "") + """
    GROUP BY cr.id
    HAVING applied_count > 0 AND failed_count > 0
    ORDER BY (CAST(failed_count AS REAL) / applied_count) DESC, failed_count DESC
    LIMIT 5;
    """, params)
    top_defects = [dict(r) for r in c.fetchall()]
    for td in top_defects:
        rate = round((td['failed_count'] / td['applied_count'] * 100), 1) if td['applied_count'] else 0
        td['failed_rate'] = rate
        
    # Danh sách cảnh báo quá hạn
    c.execute("""
    SELECT r.id, r.department_id, d.name as dept_name, r.rating, r.rating_code,
           r.han_khac_phuc, r.han_tai_giam_sat, r.inspection_time
    FROM inspection_rounds r
    JOIN departments d ON r.department_id = d.id
    WHERE r.deleted_at IS NULL AND r.year = ?
      AND (r.rating_code = 'can_cai_tien' OR r.rating_code = 'khong_dat')
    ORDER BY r.id DESC;
    """, (year,))
    overdue_actions = [dict(r) for r in c.fetchall()]
    
    conn.close()
    
    return {
        "year": year,
        "quarter": quarter,
        "total_departments": total_depts,
        "inspected_departments": inspected_count,
        "progress_rate": progress_rate,
        "average_compliance_rate": avg_compliance,
        "rating_distribution": rating_counts,
        "ranking": ranking,
        "top_defects": top_defects,
        "overdue_actions": overdue_actions
    }


# Mount Static & Frontend Files
if (STATIC_DIR / "brand").exists():
    app.mount("/static/brand", StaticFiles(directory=str(STATIC_DIR / "brand")), name="brand_static")
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend_static")

@app.get("/")
def serve_index():
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return JSONResponse({"message": "Frontend chưa khởi tạo"})
