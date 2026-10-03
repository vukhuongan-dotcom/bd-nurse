/**
 * Inspection Form Controller for BD-NURSE (63 Tiêu chuẩn con)
 * Chuẩn hóa:
 * 1. Cột Điểm thực tế (2 số thập phân, dấu ",")
 * 2. Cột Ghi chú độc lập
 * 3. Tự động cộng điểm cho mỗi chặng (Real-time Auto-Sum per Stage)
 */

function formatScore(val) {
  if (val === null || val === undefined || isNaN(val)) return '0,00';
  return Number(val).toFixed(2).replace('.', ',');
}

function parseScore(str) {
  if (str === null || str === undefined || str === '' || str === '—') return 0;
  const s = String(str).trim().replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

const InspectionForm = {
  departments: [],
  criteria: [],
  currentRoundId: null,
  scoresState: {}, // criterion_id -> { status: 'ACHIEVED'|'PARTIAL'|'FAILED'|'NA', awarded_score: float, defect_note: '' }
  autoSaveTimer: null,

  stagesMeta: [
    { name: 'Chặng I', title: 'TẠI BUỒNG BỆNH & TRỰC TIẾP TRÊN NGƯỜI BỆNH', points: 20 },
    { name: 'Chặng II', title: 'THỰC HIỆN KỸ THUẬT CHĂM SÓC, SỬ DỤNG THUỐC & AN TOÀN', points: 30 },
    { name: 'Chặng III', title: 'TỦ THUỐC, PHÒNG ĐIỀU TRỊ, TRANG THIẾT BỊ & KSNK', points: 20 },
    { name: 'Chặng IV', title: 'THỰC HIỆN CÁC BIỂU MẪU CỦA ĐIỀU DƯỠNG TRÊN EMHR', points: 25 },
    { name: 'Chặng V', title: 'SỔ SÁCH BÀN GIAO', points: 5 }
  ],

  init(departments, criteria) {
    this.departments = departments;
    this.criteria = criteria;

    this.renderDepartmentSelect();
    this.renderCriteriaStages();
    this.setupListeners();
    this.resetForm();
    this.startAutoSave();
  },

  renderDepartmentSelect() {
    const select = document.getElementById('inspect-dept-select');
    if (!select) return;
    select.innerHTML = '<option value="">-- Chọn khoa cần giám sát (27 khoa) --</option>';
    this.departments.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.name} (${d.block})`;
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      const deptId = parseInt(e.target.value);
      const dept = this.departments.find(d => d.id === deptId);
      if (dept) {
        document.getElementById('inspect-head-nurse').value = dept.default_head_nurse || '';
        this.applyDepartmentPresetKAP(dept);
      }
    });
  },

  renderCriteriaStages() {
    const container = document.getElementById('criteria-stages-container');
    if (!container) return;

    let html = '';

    this.stagesMeta.forEach((stg, stgIdx) => {
      const stgCriteria = this.criteria.filter(c => c.chang === stg.name);

      html += `
        <div class="stage-section" data-stage="${stg.name}">
          <!-- Header Chặng -->
          <div class="stage-header" onclick="InspectionForm.toggleStageAccordion(this)">
            <div class="stage-title-wrap">
              <span class="stage-badge">${stg.name} (${formatScore(stg.points)}đ)</span>
              <span class="stage-title">${stg.title}</span>
              <small class="stage-stats-pill">(${stgCriteria.length} tiêu chuẩn con)</small>
              <span class="stage-score-pill" id="stage-score-pill-${stgIdx}">Điểm đạt: ${formatScore(stg.points)} / ${formatScore(stg.points)}đ</span>
            </div>
            <div class="stage-actions" onclick="event.stopPropagation()">
              <button type="button" class="btn-stage btn-stage-achieve" onclick="InspectionForm.batchSetStage('${stg.name}', 'FULL')">
                ✓ Đạt tối đa cả chặng
              </button>
              <button type="button" class="btn-stage btn-stage-kap" onclick="InspectionForm.batchSetStage('${stg.name}', 'NA')">
                — Không áp dụng cả chặng
              </button>
            </div>
          </div>

          <!-- Body Chặng: Bảng kiểm 4 cột chuẩn hóa -->
          <div class="stage-body">
            <div class="criteria-table-header">
              <div class="col-head">STT & Điểm chuẩn</div>
              <div class="col-head">Nội dung & Tiêu chuẩn đánh giá (Yêu cầu đạt)</div>
              <div class="col-head" style="text-align:center;">Điểm thực tế (2 số thập phân, dấu ",")</div>
              <div class="col-head">Ghi chú</div>
            </div>
      `;

      stgCriteria.forEach((crit) => {
        html += `
          <div class="criterion-row" id="crit-row-${crit.id}" data-id="${crit.id}" data-score="${crit.diem}">
            <!-- Cột 1: STT & Điểm chuẩn -->
            <div class="criterion-meta">
              <span class="criterion-stt">Mục ${crit.muc_stt}.${crit.thu_tu}</span>
              <span class="criterion-score-badge">Chuẩn: ${formatScore(crit.diem)}đ</span>
            </div>

            <!-- Cột 2: Nội dung & Tiêu chí -->
            <div class="criterion-content-wrap">
              <div class="criterion-group-name">${crit.muc_ten}</div>
              <div class="criterion-desc">${crit.noi_dung}</div>
            </div>

            <!-- Cột 3: ĐIỂM THỰC TẾ (2 số thập phân, dấu ",") -->
            <div class="criterion-score-col">
              <div class="score-input-container">
                <div class="score-input-row">
                  <input type="text" class="score-input val-full" id="score-input-${crit.id}"
                         value="${formatScore(crit.diem)}"
                         data-max="${crit.diem}"
                         placeholder="0,00"
                         autocomplete="off"
                         oninput="InspectionForm.onScoreInputChange(${crit.id}, this.value)"
                         onchange="InspectionForm.onScoreInputChange(${crit.id}, this.value); InspectionForm.formatScoreInput(${crit.id})" onblur="InspectionForm.formatScoreInput(${crit.id})" />
                  <span class="score-max-hint">/ ${formatScore(crit.diem)}đ</span>
                  <span class="crit-status-badge badge-pass" id="crit-status-${crit.id}">✓ ĐẠT</span>
                </div>
                <div class="score-presets-row">
                  <button type="button" class="btn-preset btn-preset-full" title="Gán điểm tối đa (${formatScore(crit.diem)}đ)"
                          onclick="InspectionForm.setCriterionScore(${crit.id}, ${crit.diem})">
                    ✓ Đạt
                  </button>
                  <button type="button" class="btn-preset btn-preset-zero" title="Gán 0,00 điểm"
                          onclick="InspectionForm.setCriterionScore(${crit.id}, 0)">
                    ✗ 0,00
                  </button>
                  <button type="button" class="btn-preset btn-preset-na" id="btn-na-${crit.id}" title="Không áp dụng tiêu chí này"
                          onclick="InspectionForm.toggleCriterionNA(${crit.id})">
                    K.Áp dụng
                  </button>
                </div>
              </div>
            </div>

            <!-- Cột 4: CỘT GHI CHÚ RIÊNG BIỆT (Có cảnh báo Zero-PHI) -->
            <div class="criterion-note-col">
              <input type="text" class="note-input" id="note-input-${crit.id}"
                     placeholder="Ghi chú thêm nếu có..."
                     autocomplete="off"
                     oninput="InspectionForm.onDefectNoteChange(${crit.id}, this.value)" />
              <div class="dlp-alert" id="dlp-alert-${crit.id}"></div>
            </div>
          </div>
        `;
      });

      // Dòng Tự động cộng điểm cho mỗi chặng (Chân chặng)
      html += `
            <div class="stage-subtotal-bar" id="stage-subtotal-${stgIdx}">
              <div class="subtotal-title">
                <span>📊</span>
                <span>TỔNG ĐIỂM ${stg.name.toUpperCase()}:</span>
              </div>
              <div class="subtotal-values" id="stage-subtotal-val-${stgIdx}">
                <span class="subtotal-points">${formatScore(stg.points)} / ${formatScore(stg.points)} điểm</span>
                <span class="subtotal-rate">(Tỷ lệ tuân thủ: 100,0%)</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  toggleStageAccordion(headerEl) {
    const body = headerEl.nextElementSibling;
    if (body.style.display === 'none') {
      body.style.display = 'block';
    } else {
      body.style.display = 'none';
    }
  },

  resetForm() {
    this.currentRoundId = null;
    this.scoresState = {};
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formattedTime = `${pad(now.getHours())}:${pad(now.getMinutes())} ${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;

    const timeInput = document.getElementById('inspect-time');
    if (timeInput) timeInput.value = formattedTime;

    const deptSelect = document.getElementById('inspect-dept-select');
    if (deptSelect) deptSelect.value = '';

    const headNurseInput = document.getElementById('inspect-head-nurse');
    if (headNurseInput) headNurseInput.value = '';

    const inspectorsInput = document.getElementById('inspect-inspectors');
    if (inspectorsInput) inspectorsInput.value = 'ThS. ĐD. Trần Thị B\nCNĐD. Lê Văn C';

    const seriousCb = document.getElementById('serious-violation-cb');
    if (seriousCb) seriousCb.checked = false;
    this.toggleSeriousViolationSection(false);

    // Mặc định tất cả 63 dòng đều đạt điểm tối đa
    this.criteria.forEach(c => {
      this.scoresState[c.id] = {
        status: 'ACHIEVED',
        awarded_score: c.diem,
        defect_note: ''
      };
      this.updateCriterionUI(c.id);
    });

    this.recalculateScores();
    this.updateExportButtonsState(false);
  },

  onScoreInputChange(criterionId, rawVal) {
    const crit = this.criteria.find(c => c.id === criterionId);
    if (!crit) return;

    if (!this.scoresState[criterionId]) {
      this.scoresState[criterionId] = { status: 'ACHIEVED', awarded_score: crit.diem, defect_note: '' };
    }

    const state = this.scoresState[criterionId];
    const parsed = parseScore(rawVal);
    const capped = Math.max(0, Math.min(parsed, crit.diem));

    state.awarded_score = capped;
    // Quy tắc: Full điểm -> ĐẠT, < điểm chuẩn -> KHÔNG ĐẠT (Thực hiện auto)
    state.status = (capped >= crit.diem) ? 'ACHIEVED' : 'FAILED';

    this.updateCriterionUI(criterionId);
    this.recalculateScores();
    this.updateDeficienciesList();
  },

  formatScoreInput(criterionId) {
    const state = this.scoresState[criterionId];
    const input = document.getElementById(`score-input-${criterionId}`);
    if (state && input) {
      if (state.status === 'NA') {
        input.value = '—';
      } else {
        input.value = formatScore(state.awarded_score);
      }
    }
  },

  setCriterionScore(criterionId, scoreVal) {
    const crit = this.criteria.find(c => c.id === criterionId);
    if (!crit) return;

    if (!this.scoresState[criterionId]) {
      this.scoresState[criterionId] = { status: 'ACHIEVED', awarded_score: crit.diem, defect_note: '' };
    }

    const state = this.scoresState[criterionId];
    const capped = Math.max(0, Math.min(scoreVal, crit.diem));
    state.awarded_score = capped;

    state.awarded_score = capped;
    // Quy tắc: Full điểm -> ĐẠT, < điểm chuẩn -> KHÔNG ĐẠT (Thực hiện auto)
    state.status = (capped >= crit.diem) ? 'ACHIEVED' : 'FAILED';

    const input = document.getElementById(`score-input-${criterionId}`);
    if (input) input.value = formatScore(capped);

    this.updateCriterionUI(criterionId);
    this.recalculateScores();
    this.updateDeficienciesList();

    // Auto-focus vào ô ghi chú khi bị 0 điểm
    if (capped === 0) {
      const noteInput = document.getElementById(`note-input-${criterionId}`);
      if (noteInput && !noteInput.value.trim()) {
        noteInput.focus();
      }
    }
  },

  toggleCriterionNA(criterionId) {
    const crit = this.criteria.find(c => c.id === criterionId);
    if (!crit) return;

    if (!this.scoresState[criterionId]) {
      this.scoresState[criterionId] = { status: 'ACHIEVED', awarded_score: crit.diem, defect_note: '' };
    }

    const state = this.scoresState[criterionId];
    if (state.status === 'NA') {
      // Bỏ Không áp dụng -> khôi phục điểm tối đa
      state.status = 'ACHIEVED';
      state.awarded_score = crit.diem;
      const input = document.getElementById(`score-input-${criterionId}`);
      if (input) input.value = formatScore(crit.diem);
    } else {
      // Đánh dấu Không áp dụng
      state.status = 'NA';
      state.awarded_score = 0;
      const input = document.getElementById(`score-input-${criterionId}`);
      if (input) input.value = '—';
    }

    this.updateCriterionUI(criterionId);
    this.recalculateScores();
    this.updateDeficienciesList();
  },

  onDefectNoteChange(criterionId, note) {
    if (!this.scoresState[criterionId]) {
      this.scoresState[criterionId] = { status: 'ACHIEVED', awarded_score: 0, defect_note: '' };
    }
    this.scoresState[criterionId].defect_note = note;

    // Zero-PHI Live Scanning
    const dlpAlertEl = document.getElementById(`dlp-alert-${criterionId}`);
    if (dlpAlertEl) {
      const alertMsg = App.scanDLP(note);
      if (alertMsg) {
        dlpAlertEl.textContent = `⚠️ DLP: ${alertMsg}`;
        dlpAlertEl.classList.add('show');
      } else {
        dlpAlertEl.classList.remove('show');
      }
    }

    this.updateDeficienciesList();
  },

  updateCriterionUI(criterionId) {
    const state = this.scoresState[criterionId];
    const crit = this.criteria.find(c => c.id === criterionId);
    if (!state || !crit) return;

    const input = document.getElementById(`score-input-${criterionId}`);
    const btnNa = document.getElementById(`btn-na-${criterionId}`);
    const noteInput = document.getElementById(`note-input-${criterionId}`);

    if (input) {
      input.classList.remove('val-full', 'val-partial', 'val-zero', 'val-na');
      if (state.status === 'NA') {
        input.classList.add('val-na');
        input.disabled = true;
      } else {
        input.disabled = false;
        if (state.awarded_score >= crit.diem) {
          input.classList.add('val-full');
        } else if (state.awarded_score === 0) {
          input.classList.add('val-zero');
        } else {
          input.classList.add('val-partial');
        }
      }
    }

    const badge = document.getElementById(`crit-status-${criterionId}`);
    if (badge) {
      badge.classList.remove('badge-pass', 'badge-fail', 'badge-na');
      if (state.status === 'NA') {
        badge.classList.add('badge-na');
        badge.textContent = '— K.ÁP DỤNG';
      } else if (state.awarded_score >= crit.diem) {
        badge.classList.add('badge-pass');
        badge.textContent = '✓ ĐẠT';
      } else {
        badge.classList.add('badge-fail');
        badge.textContent = '✗ KHÔNG ĐẠT';
      }
    }

    if (btnNa) {
      if (state.status === 'NA') {
        btnNa.classList.add('active-na-pill');
      } else {
        btnNa.classList.remove('active-na-pill');
      }
    }

    if (noteInput) {
      if (state.defect_note !== undefined && noteInput.value !== state.defect_note) {
        noteInput.value = state.defect_note;
      }

      noteInput.classList.remove('state-failed', 'state-na');
      if (state.status === 'NA') {
        noteInput.classList.add('state-na');
        noteInput.placeholder = 'Lý do không áp dụng (tùy chọn)...';
      } else if (state.awarded_score < crit.diem) {
        noteInput.classList.add('state-failed');
        noteInput.placeholder = 'Nhập cụ thể lý do trừ điểm / sai sót (Không ghi PHI)...';
      } else {
        noteInput.placeholder = 'Ghi chú thêm nếu có...';
      }
    }
  },

  batchSetStage(stageName, targetAction) {
    const stageCriteria = this.criteria.filter(c => c.chang === stageName);
    stageCriteria.forEach(c => {
      if (targetAction === 'FULL') {
        this.setCriterionScore(c.id, c.diem);
      } else if (targetAction === 'NA') {
        if (!this.scoresState[c.id]) {
          this.scoresState[c.id] = { status: 'ACHIEVED', awarded_score: c.diem, defect_note: '' };
        }
        this.scoresState[c.id].status = 'NA';
        this.scoresState[c.id].awarded_score = 0;
        const input = document.getElementById(`score-input-${c.id}`);
        if (input) input.value = '—';
        this.updateCriterionUI(c.id);
      }
    });

    this.recalculateScores();
    this.updateDeficienciesList();
  },

  applyDepartmentPresetKAP(dept) {
    const kapPreset = dept.kap_preset || [];
    const noticeEl = document.getElementById('department-preset-notice');
    const noticeText = document.getElementById('preset-notice-text');

    if (kapPreset.length === 0) {
      if (noticeEl) noticeEl.style.display = 'none';
      return;
    }

    if (noticeEl && noticeText) {
      noticeText.textContent = `Khoa đặc thù (${dept.name}): Đã tự động kích hoạt preset gợi ý các mục Không áp dụng.`;
      noticeEl.style.display = 'flex';
    }

    if (kapPreset.includes('chang_1')) {
      this.batchSetStage('Chặng I', 'NA');
    }

    if (kapPreset.includes('muc_9')) {
      this.criteria.filter(c => c.muc_stt === 9).forEach(c => {
        this.scoresState[c.id].status = 'NA';
        this.scoresState[c.id].awarded_score = 0;
        const inp = document.getElementById(`score-input-${c.id}`);
        if (inp) inp.value = '—';
        this.updateCriterionUI(c.id);
      });
    }
    if (kapPreset.includes('muc_10')) {
      this.criteria.filter(c => c.muc_stt === 10).forEach(c => {
        this.scoresState[c.id].status = 'NA';
        this.scoresState[c.id].awarded_score = 0;
        const inp = document.getElementById(`score-input-${c.id}`);
        if (inp) inp.value = '—';
        this.updateCriterionUI(c.id);
      });
    }
    if (kapPreset.includes('muc_11')) {
      this.criteria.filter(c => c.muc_stt === 11).forEach(c => {
        this.scoresState[c.id].status = 'NA';
        this.scoresState[c.id].awarded_score = 0;
        const inp = document.getElementById(`score-input-${c.id}`);
        if (inp) inp.value = '—';
        this.updateCriterionUI(c.id);
      });
    }
    if (kapPreset.includes('muc_12')) {
      this.criteria.filter(c => c.muc_stt === 12).forEach(c => {
        this.scoresState[c.id].status = 'NA';
        this.scoresState[c.id].awarded_score = 0;
        const inp = document.getElementById(`score-input-${c.id}`);
        if (inp) inp.value = '—';
        this.updateCriterionUI(c.id);
      });
    }

    this.recalculateScores();
    this.updateDeficienciesList();
    App.showToast(`Đã áp dụng preset gợi ý Không áp dụng cho khoa ${dept.name}`, 'info');
  },

  recalculateScores() {
    let totalAchieved = 0;
    let totalKap = 0;
    let countFull = 0;
    let countDeducted = 0;
    let countNa = 0;
    const totalStandard = 100;

    // 1. Tự động tính toán & cập nhật điểm từng chặng
    this.stagesMeta.forEach((stg, stgIdx) => {
      const stgCriteria = this.criteria.filter(c => c.chang === stg.name);
      let stgAchieved = 0;
      let stgKap = 0;

      stgCriteria.forEach(c => {
        const state = this.scoresState[c.id] || { status: 'ACHIEVED', awarded_score: c.diem };
        if (state.status === 'NA') {
          stgKap += c.diem;
          totalKap += c.diem;
          countNa++;
        } else {
          const score = Number(state.awarded_score || 0);
          stgAchieved += score;
          totalAchieved += score;
          if (score === c.diem) {
            countFull++;
          } else {
            countDeducted++;
          }
        }
      });

      const stgEffectiveDen = stg.points - stgKap;
      let stgRate = 0;
      if (stgEffectiveDen > 0) {
        stgRate = Math.round((stgAchieved / stgEffectiveDen * 100) * 10) / 10;
      }

      const stgAchievedStr = formatScore(stgAchieved);
      const stgDenStr = formatScore(stgEffectiveDen);
      const stgRateStr = stgRate.toFixed(1).replace('.', ',') + '%';

      // Cập nhật Header Pill chặng
      const pillEl = document.getElementById(`stage-score-pill-${stgIdx}`);
      if (pillEl) {
        pillEl.textContent = `Điểm đạt: ${stgAchievedStr} / ${stgDenStr}đ (${stgRateStr})`;
      }

      // Cập nhật Footer chặng
      const subtotalValEl = document.getElementById(`stage-subtotal-val-${stgIdx}`);
      if (subtotalValEl) {
        subtotalValEl.innerHTML = `
          <span class="subtotal-points">${stgAchievedStr} / ${stgDenStr} điểm</span>
          <span class="subtotal-rate">(Tỷ lệ tuân thủ: ${stgRateStr})</span>
        `;
      }
    });

    // 2. Tính toán tổng toàn viện
    const effectiveDenominator = totalStandard - totalKap;
    let complianceRate = 0;

    if (effectiveDenominator > 0) {
      complianceRate = Math.round((totalAchieved / effectiveDenominator * 100) * 10) / 10;
    }

    const seriousCb = document.getElementById('serious-violation-cb');
    const isSerious = seriousCb ? seriousCb.checked : false;

    let rating = 'Đạt';
    let ratingCode = 'dat';

    if (isSerious) {
      rating = 'KHÔNG ĐẠT (VI PHẠM NB)';
      ratingCode = 'khong_dat';
    } else {
      if (complianceRate >= 90.0) {
        rating = 'Đạt';
        ratingCode = 'dat';
      } else if (complianceRate >= 80.0) {
        rating = 'Tốt / Đạt yêu cầu';
        ratingCode = 'tot';
      } else if (complianceRate >= 70.0) {
        rating = 'Cần cải tiến';
        ratingCode = 'can_cai_tien';
      } else {
        rating = 'KHÔNG ĐẠT';
        ratingCode = 'khong_dat';
      }
    }

    // 3. Cập nhật Sticky Score Bar
    const achievedEl = document.getElementById('score-bar-achieved');
    const rateEl = document.getElementById('score-bar-rate');
    const ratingBadgeEl = document.getElementById('score-bar-rating');
    const subCountsEl = document.getElementById('score-bar-subcounts');

    const totalAchievedStr = formatScore(totalAchieved);
    const totalDenStr = formatScore(effectiveDenominator);
    const rateStr = complianceRate.toFixed(1).replace('.', ',') + '%';

    if (achievedEl) achievedEl.textContent = `${totalAchievedStr} / ${totalDenStr}đ`;
    if (rateEl) rateEl.textContent = rateStr;
    if (ratingBadgeEl) {
      ratingBadgeEl.textContent = rating;
      ratingBadgeEl.className = `rating-badge ${ratingCode}`;
    }
    if (subCountsEl) {
      subCountsEl.textContent = `${countFull} Đạt · ${countDeducted} Không đạt · ${countNa} Không áp dụng`;
    }
  },

  updateDeficienciesList() {
    const listEl = document.getElementById('corrective-deficiencies');
    if (!listEl) return;

    const failedItems = [];
    this.criteria.forEach(c => {
      const state = this.scoresState[c.id];
      if (state && state.status !== 'NA' && state.awarded_score < c.diem) {
        const note = state.defect_note ? `: ${state.defect_note}` : '';
        failedItems.push(`- Mục ${c.muc_stt}.${c.thu_tu} (${c.muc_ten}) [${formatScore(state.awarded_score)}/${formatScore(c.diem)}đ]${note}`);
      }
    });

    if (failedItems.length > 0) {
      listEl.value = failedItems.join('\n');
    } else {
      listEl.value = '- Không có tồn tại ghi nhận (Đạt điểm tối đa toàn bộ).';
    }
  },

  toggleSeriousViolationSection(show) {
    const section = document.getElementById('serious-violation-details');
    if (section) section.style.display = show ? 'block' : 'none';
  },

  setupListeners() {
    const seriousCb = document.getElementById('serious-violation-cb');
    if (seriousCb) {
      seriousCb.addEventListener('change', (e) => {
        this.toggleSeriousViolationSection(e.target.checked);
        this.recalculateScores();
      });
    }

    const btnSaveDraft = document.getElementById('btn-save-draft');
    if (btnSaveDraft) {
      btnSaveDraft.addEventListener('click', () => this.submitInspection('nhap'));
    }

    const btnComplete = document.getElementById('btn-complete-inspection');
    if (btnComplete) {
      btnComplete.addEventListener('click', () => this.submitInspection('hoan_tat'));
    }

    const btnExportDocx = document.getElementById('btn-quick-export-docx');
    if (btnExportDocx) {
      btnExportDocx.addEventListener('click', () => {
        if (!this.currentRoundId) {
          App.showToast('Vui lòng lưu đợt kiểm tra trước khi xuất file!', 'error');
          return;
        }
        window.open(`/api/inspections/${this.currentRoundId}/export-docx`, '_blank');
      });
    }

    const btnExportPdf = document.getElementById('btn-quick-export-pdf');
    if (btnExportPdf) {
      btnExportPdf.addEventListener('click', () => {
        if (!this.currentRoundId) {
          App.showToast('Vui lòng lưu đợt kiểm tra trước khi xuất file!', 'error');
          return;
        }
        window.open(`/api/inspections/${this.currentRoundId}/export-pdf`, '_blank');
      });
    }
  },

  async submitInspection(targetStatus) {
    const deptSelect = document.getElementById('inspect-dept-select');
    const deptId = parseInt(deptSelect.value);
    if (!deptId) {
      App.showToast('Vui lòng chọn khoa được giám sát!', 'error');
      return;
    }

    const inspectionTime = document.getElementById('inspect-time').value.trim();
    const headNurse = document.getElementById('inspect-head-nurse').value.trim();
    const inspectors = document.getElementById('inspect-inspectors').value.trim();
    const isSerious = document.getElementById('serious-violation-cb').checked;
    const seriousType = document.getElementById('serious-violation-type').value;
    const seriousDesc = document.getElementById('serious-violation-desc').value.trim();

    const details = this.criteria.map(c => {
      const state = this.scoresState[c.id] || { status: 'ACHIEVED', awarded_score: c.diem, defect_note: '' };
      return {
        criterion_id: c.id,
        status: state.status,
        awarded_score: state.status === 'NA' ? 0.0 : Number(state.awarded_score || 0),
        defect_note: state.defect_note
      };
    });

    const correctivePlan = {
      deficiencies_summary: document.getElementById('corrective-deficiencies').value.trim(),
      action_measures: document.getElementById('corrective-measures').value.trim(),
      person_in_charge: document.getElementById('corrective-person').value.trim() || headNurse,
      deadline: document.getElementById('corrective-deadline').value.trim()
    };

    const payload = {
      department_id: deptId,
      loai_dot: document.getElementById('inspect-type').value,
      quarter: App.currentQuarter || 4,
      year: App.currentYear || 2026,
      inspection_time: inspectionTime,
      head_nurse: headNurse,
      inspectors: inspectors,
      is_serious_violation: isSerious,
      serious_violation_type: isSerious ? seriousType : null,
      serious_violation_desc: isSerious ? seriousDesc : null,
      trang_thai: targetStatus,
      details: details,
      corrective_plan: correctivePlan
    };

    try {
      let res;
      if (this.currentRoundId) {
        res = await fetch(`/api/inspections/${this.currentRoundId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || 'Lỗi lưu đợt kiểm tra');

      if (!this.currentRoundId && result.id) {
        this.currentRoundId = result.id;
      }

      this.updateExportButtonsState(true);
      App.showToast(targetStatus === 'nhap' ? 'Đã lưu nháp đợt kiểm tra thành công!' : 'Đã hoàn tất đợt kiểm tra! Có thể xuất file Word / PDF.', 'success');
    } catch (e) {
      App.showToast(`Lỗi: ${e.message}`, 'error');
    }
  },

  updateExportButtonsState(enabled) {
    const btnDocx = document.getElementById('btn-quick-export-docx');
    const btnPdf = document.getElementById('btn-quick-export-pdf');
    if (btnDocx) btnDocx.style.display = enabled ? 'inline-flex' : 'none';
    if (btnPdf) btnPdf.style.display = enabled ? 'inline-flex' : 'none';
  },

  async loadExistingInspection(roundId) {
    try {
      const res = await fetch(`/api/inspections/${roundId}`);
      if (!res.ok) throw new Error('Không thể tải đợt kiểm tra');
      const data = await res.json();

      this.currentRoundId = data.id;
      App.switchTab('tab-inspection');

      document.getElementById('inspect-dept-select').value = data.department_id;
      document.getElementById('inspect-type').value = data.loai_dot;
      document.getElementById('inspect-time').value = data.inspection_time;
      document.getElementById('inspect-head-nurse').value = data.head_nurse;
      document.getElementById('inspect-inspectors').value = data.inspectors;

      const seriousCb = document.getElementById('serious-violation-cb');
      seriousCb.checked = Boolean(data.is_serious_violation);
      this.toggleSeriousViolationSection(seriousCb.checked);
      if (seriousCb.checked) {
        document.getElementById('serious-violation-type').value = data.serious_violation_type || '';
        document.getElementById('serious-violation-desc').value = data.serious_violation_desc || '';
      }

      // Nạp 63 dòng con
      this.scoresState = {};
      data.details.forEach(d => {
        const crit = this.criteria.find(c => c.id === d.criterion_id);
        const maxScore = crit ? crit.diem : 1;
        const awarded = d.awarded_score !== undefined ? Number(d.awarded_score) : (d.status === 'ACHIEVED' ? maxScore : 0);
        this.scoresState[d.criterion_id] = {
          status: d.status,
          awarded_score: awarded,
          defect_note: d.defect_note || ''
        };

        const input = document.getElementById(`score-input-${d.criterion_id}`);
        if (input) {
          input.value = d.status === 'NA' ? '—' : formatScore(awarded);
        }
        this.updateCriterionUI(d.criterion_id);
      });

      // Kế hoạch khắc phục
      if (data.corrective_plan) {
        document.getElementById('corrective-deficiencies').value = data.corrective_plan.deficiencies_summary || '';
        document.getElementById('corrective-measures').value = data.corrective_plan.action_measures || '';
        document.getElementById('corrective-person').value = data.corrective_plan.person_in_charge || '';
        document.getElementById('corrective-deadline').value = data.corrective_plan.deadline || '';
      }

      this.recalculateScores();
      this.updateExportButtonsState(true);
      App.showToast(`Đã mở đợt kiểm tra #${data.id} (${data.dept_name})`, 'info');
    } catch (e) {
      App.showToast(`Lỗi: ${e.message}`, 'error');
    }
  },

  startAutoSave() {
    this.autoSaveTimer = setInterval(() => {
      const deptSelect = document.getElementById('inspect-dept-select');
      if (deptSelect && deptSelect.value && App.currentTab === 'tab-inspection') {
        this.submitInspection('nhap');
      }
    }, 30000);
  }
};
