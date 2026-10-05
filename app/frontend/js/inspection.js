/**
 * Inspection Form Controller for BD-NURSE (63 Tiêu chuẩn con)
 * Thiết kế lại theo PLAN_THIET_KE_LAI_UI_NURSE_2026-10-03
 * Phê duyệt bởi BSCKII. Vũ Khương An
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


// Danh sách 30 Điều dưỡng trưởng khoa (1-30)
const HEAD_NURSES_LIST = [
  "Trần Thị Thu Nga",
  "Nguyễn Thị Ngọc Thùy",
  "Huỳnh Thị Thanh Tâm",
  "Trần Thị Anh Đào",
  "Phạm Thị Thanh Sang",
  "Vũ Thị Hồng Yến",
  "Trân Thị Xuân Hòa",
  "Ngô Thị Ánh Nghĩa",
  "Tăng Thị Quỳnh Mai",
  "Huỳnh Thị Hoàng Oanh",
  "Nguyễn Thị Thu Nga",
  "Nguyễn Thị Hoàng Hoa",
  "Nguyễn Thị Bích Dung",
  "Diệp Thị Thùy Linh",
  "Trương Thị Kim Thoa",
  "Nguyễn Hạnh Minh Tâm",
  "Ngô Thị Hồng",
  "Chu Thị Nguyệt",
  "Phạm Thị Diệu Hiền",
  "Lê Anh Bảo",
  "Võ Thị Như Sương",
  "Bùi Thị Ngọc Truyền",
  "Nguyễn Thị Thùy Linh",
  "Trần Thị Kim Hương",
  "Nguyễn Văn Cảnh",
  "Nguyễn Thành Trung",
  "Trần Thị Khuê Nữ",
  "Trần Thị Minh Hòa",
  "Trần Ngọc Thúy Uyên",
  "Nguyễn Thị Thùy Trinh"
];

// Danh sách 36 Thành viên đoàn giám sát (1-36)
const INSPECTORS_LIST = [
  "Trần Thị Thu Nga",
  "Nguyễn Thị Ngọc Thùy",
  "Huỳnh Thị Thanh Tâm",
  "Trần Thị Anh Đào",
  "Phạm Thị Thanh Sang",
  "Vũ Thị Hồng Yến",
  "Trân Thị Xuân Hòa",
  "Ngô Thị Ánh Nghĩa",
  "Tăng Thị Quỳnh Mai",
  "Huỳnh Thị Hoàng Oanh",
  "Nguyễn Thị Thu Nga",
  "Nguyễn Thị Hoàng Hoa",
  "Nguyễn Thị Bích Dung",
  "Diệp Thị Thùy Linh",
  "Trương Thị Kim Thoa",
  "Nguyễn Hạnh Minh Tâm",
  "Ngô Thị Hồng",
  "Chu Thị Nguyệt",
  "Phạm Thị Diệu Hiền",
  "Lê Anh Bảo",
  "Võ Thị Như Sương",
  "Bùi Thị Ngọc Truyền",
  "Nguyễn Thị Thùy Linh",
  "Trần Thị Kim Hương",
  "Nguyễn Văn Cảnh",
  "Nguyễn Thành Trung",
  "Trần Thị Khuê Nữ",
  "Trần Thị Minh Hòa",
  "Trần Ngọc Thúy Uyên",
  "Nguyễn Thị Thùy Trinh",
  "Lê Nhật Quang Hoà",
  "Trần Thị Thuỳ Dương",
  "Trần Thị Thanh Phương",
  "Võ Thị Thuý Hằng",
  "Nguyễn Thị Anh Trâm",
  "Nguyễn Thị Huỳnh Dao"
];

const InspectionForm = {
  departments: [],
  criteria: [],
  currentRoundId: null,
  scoresState: {}, // criterion_id -> { status: 'ACHIEVED'|'FAILED'|'NA', awarded_score: float, defect_note: '' }
  autoSaveTimer: null,

  stagesMeta: [
    { name: 'Chặng I', title: 'Tại buồng bệnh & trực tiếp trên người bệnh', points: 20 },
    { name: 'Chặng II', title: 'Thực hiện kỹ thuật chăm sóc, sử dụng thuốc & an toàn', points: 30 },
    { name: 'Chặng III', title: 'Tủ thuốc, phòng điều trị, trang thiết bị & KSNK', points: 20 },
    { name: 'Chặng IV', title: 'Thực hiện các biểu mẫu của điều dưỡng trên EMHR', points: 25 },
    { name: 'Chặng V', title: 'Sổ sách bàn giao', points: 5 }
  ],

  init(departments, criteria) {
    this.departments = departments;
    this.criteria = criteria;

    this.renderDepartmentSelect();
    this.initInspectorsPicker();
    this.renderCriteriaStages();
    this.setupDateTimeSync();
    this.initCorrectiveListeners();
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
        this.updateMetaSummaryBadge();
      }
    });
  },

  setupDateTimeSync() {
    const dtInput = document.getElementById('inspect-datetime-local');
    const hiddenTime = document.getElementById('inspect-time');

    if (dtInput) {
      dtInput.addEventListener('change', () => {
        if (dtInput.value) {
          const d = new Date(dtInput.value);
          const pad = n => String(n).padStart(2, '0');
          const formatted = `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
          if (hiddenTime) hiddenTime.value = formatted;
          this.updateMetaSummaryBadge();
        }
      });
    }
  },

  initCorrectiveListeners() {
    const defEl = document.getElementById('corrective-deficiencies');
    if (defEl) {
      defEl.addEventListener('input', () => {
        this.autoResizeDeficiencies();
        this.populatePrintSheet();
      });
    }
    const measuresEl = document.getElementById('corrective-measures');
    if (measuresEl) {
      measuresEl.addEventListener('input', () => this.populatePrintSheet());
    }
    const deadlineEl = document.getElementById('corrective-deadline');
    if (deadlineEl) {
      deadlineEl.addEventListener('input', () => this.populatePrintSheet());
    }
    window.addEventListener('beforeprint', () => this.populatePrintSheet());
  },

  updateMetaSummaryBadge() {
    const deptSelect = document.getElementById('inspect-dept-select');
    const dtInput = document.getElementById('inspect-datetime-local');
    const badge = document.getElementById('meta-summary-badge');
    
    if (!badge) return;

    if (deptSelect && deptSelect.value) {
      const selectedText = deptSelect.options[deptSelect.selectedIndex].text.split('(')[0].trim();
      let timeText = '';
      if (dtInput && dtInput.value) {
        const d = new Date(dtInput.value);
        timeText = ` · ${d.getDate()}/${d.getMonth()+1}`;
      }
      badge.textContent = `${selectedText}${timeText}`;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  },

  initInspectorsPicker() {
    const listEl = document.getElementById('inspectors-scroll-list');
    if (!listEl) return;

    listEl.innerHTML = INSPECTORS_LIST.map((name, idx) => `
      <label class="inspector-item" id="inspector-item-${idx}" data-name="${name.toLowerCase()}">
        <input type="checkbox" class="inspector-checkbox" value="${name}" onchange="InspectionForm.onInspectorCheckboxChange(this)" />
        <span class="inspector-idx">${idx + 1}.</span>
        <span class="inspector-name">${name}</span>
      </label>
    `).join('');

    const iconBtn = document.getElementById('icon-inspectors-btn');
    if (iconBtn && typeof Icons.users === 'function') {
      iconBtn.innerHTML = Icons.users('icon-sm');
    }

    const searchIcon = document.getElementById('icon-picker-search');
    if (searchIcon && typeof Icons.search === 'function') {
      searchIcon.innerHTML = Icons.search('icon-sm');
    }
  },

  toggleInspectorsPicker(force) {
    const panel = document.getElementById('inspectors-picker-panel');
    if (!panel) return;
    const isVisible = panel.style.display !== 'none';
    const nextState = force !== undefined ? force : !isVisible;
    panel.style.display = nextState ? 'block' : 'none';
    if (nextState) {
      const search = document.getElementById('inspectors-search-input');
      if (search) {
        search.value = '';
        this.filterInspectorsList('');
        search.focus();
      }
    }
  },

  filterInspectorsList(query) {
    const q = (query || '').toLowerCase().trim();
    const items = document.querySelectorAll('.inspector-item');
    items.forEach(item => {
      const name = item.getAttribute('data-name') || '';
      item.style.display = (!q || name.includes(q)) ? 'flex' : 'none';
    });
  },

  onInspectorCheckboxChange(checkbox) {
    const item = checkbox.closest('.inspector-item');
    if (item) {
      item.classList.toggle('selected', checkbox.checked);
    }
    this.updateInspectorsFromCheckboxes();
  },

  updateInspectorsFromCheckboxes() {
    const checkboxes = document.querySelectorAll('.inspector-checkbox:checked');
    const selectedNames = Array.from(checkboxes).map(cb => cb.value);
    
    // Cập nhật textarea (mỗi người một dòng)
    const textarea = document.getElementById('inspect-inspectors');
    if (textarea) {
      textarea.value = selectedNames.join('\n');
    }

    this.renderSelectedInspectorChips(selectedNames);
  },

  renderSelectedInspectorChips(names) {
    const chipsContainer = document.getElementById('selected-inspectors-chips');
    const badge = document.getElementById('inspectors-count-badge');
    
    if (badge) badge.innerText = names.length;

    if (!chipsContainer) return;
    if (names.length === 0) {
      chipsContainer.style.display = 'none';
      chipsContainer.innerHTML = '';
      return;
    }

    chipsContainer.style.display = 'flex';
    chipsContainer.innerHTML = names.map(name => `
      <span class="inspector-chip">
        <span>${name}</span>
        <button type="button" title="Bỏ chọn ${name}" onclick="InspectionForm.removeInspector('${name}')">&times;</button>
      </span>
    `).join('');
  },

  removeInspector(name) {
    const checkboxes = document.querySelectorAll('.inspector-checkbox');
    let found = false;
    checkboxes.forEach(cb => {
      if (cb.value === name) {
        cb.checked = false;
        found = true;
        const item = cb.closest('.inspector-item');
        if (item) item.classList.remove('selected');
      }
    });
    if (found) {
      this.updateInspectorsFromCheckboxes();
    } else {
      const textarea = document.getElementById('inspect-inspectors');
      if (textarea) {
        const remaining = (textarea.value || '')
          .split(/[\n,;]+/)
          .map(l => l.replace(/^\d+[\.\s\-\)]*/, '').trim())
          .filter(l => l && l !== name);
        textarea.value = remaining.join('\n');
        this.renderSelectedInspectorChips(remaining);
      }
    }
  },

  clearAllInspectors() {
    const checkboxes = document.querySelectorAll('.inspector-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = false;
      const item = cb.closest('.inspector-item');
      if (item) item.classList.remove('selected');
    });
    this.updateInspectorsFromCheckboxes();
  },

  syncInspectorsFromTextarea() {
    const textarea = document.getElementById('inspect-inspectors');
    if (!textarea) return;

    const rawVal = textarea.value || '';
    const lines = rawVal
      .split(/[\n,;]+/)
      .map(l => l.replace(/^\d+[\.\s\-\)]*/, '').trim())
      .filter(Boolean);

    const checkboxes = document.querySelectorAll('.inspector-checkbox');
    checkboxes.forEach(cb => {
      const isChecked = lines.some(line => line.toLowerCase() === cb.value.toLowerCase() || line.includes(cb.value) || cb.value.includes(line));
      cb.checked = isChecked;
      const item = cb.closest('.inspector-item');
      if (item) item.classList.toggle('selected', isChecked);
    });

    this.renderSelectedInspectorChips(lines);
  },

  renderCriteriaStages() {
    const container = document.getElementById('criteria-stages-container');
    const stageChipsContainer = document.getElementById('stage-chips-container');
    if (!container) return;

    let stagesHtml = '';
    let chipsHtml = '';

    this.stagesMeta.forEach((stg, stgIdx) => {
      const stgCriteria = this.criteria.filter(c => c.chang === stg.name);

      // Nhóm theo mục lớn (muc_stt)
      const groupsMap = new Map();
      stgCriteria.forEach(c => {
        if (!groupsMap.has(c.muc_stt)) {
          groupsMap.set(c.muc_stt, {
            muc_stt: c.muc_stt,
            muc_ten: c.muc_ten,
            items: []
          });
        }
        groupsMap.get(c.muc_stt).items.push(c);
      });

      // Chip nhảy chặng
      chipsHtml += `
        <button type="button" class="stage-chip" id="stage-chip-${stgIdx}" onclick="InspectionForm.scrollToStage('${stg.name}')">
          <span>${stg.name}</span>
          <span id="chip-status-icon-${stgIdx}"></span>
        </button>
      `;

      stagesHtml += `
        <section class="stage-section" id="stage-section-${stg.name.replace(/\s+/g, '')}" data-stage="${stg.name}">
          <!-- Header Chặng -->
          <div class="stage-header" onclick="InspectionForm.toggleStageAccordion(this)">
            <div class="stage-title-wrap">
              <span class="stage-badge">${stg.name} (${formatScore(stg.points)}đ)</span>
              <span class="stage-title">${stg.title}</span>
              <span class="stage-progress-badge" id="stage-progress-badge-${stgIdx}">(0/${stgCriteria.length} đã chấm)</span>
            </div>
            <div class="stage-actions" onclick="event.stopPropagation()">
              <button type="button" class="btn-stage" onclick="InspectionForm.batchSetStage('${stg.name}', 'FULL')">
                <span>Đạt cả chặng</span>
              </button>
              <button type="button" class="btn-stage" onclick="InspectionForm.batchSetStage('${stg.name}', 'NA')">
                <span>KAP cả chặng</span>
              </button>
              <span class="stage-chevron" id="icon-stage-chevron-${stgIdx}">${Icons.chevronDown('icon-sm')}</span>
            </div>
          </div>

          <!-- Thân Chặng: Các nhóm mục & dòng con -->
          <div class="stage-body">
      `;

      // Render từng nhóm mục và dòng con
      groupsMap.forEach(grp => {
        stagesHtml += `
          <div class="criterion-group-header">
            ${grp.muc_stt}. ${grp.muc_ten}
          </div>
        `;

        grp.items.forEach((crit, itemIdx) => {
          // Hiển thị chuẩn theo mục: ${muc_stt}.${chỉ số trong mục} (1.1, 1.2, 1.3...)
          const itemNumber = `${grp.muc_stt}.${itemIdx + 1}`;

          stagesHtml += `
            <div class="criterion-row" id="crit-row-${crit.id}" data-id="${crit.id}" data-score="${crit.diem}">
              <div class="criterion-row-top">
                <div class="criterion-info-col">
                  <span class="criterion-num">${itemNumber}</span>
                  <div class="criterion-desc">${crit.noi_dung}</div>
                </div>
                <div class="criterion-score-badge-wrap">
                  <span class="criterion-score-chip" title="Điểm chuẩn">${formatScore(crit.diem)}đ</span>
                  <select class="criterion-actual-select criterion-actual-chip status-achieved" id="crit-actual-chip-${crit.id}"
                          title="Cuộn để chọn điểm thực tế"
                          aria-label="Chọn điểm thực tế tiêu chuẩn ${itemNumber}"
                          onchange="InspectionForm.onCriterionScoreChange(${crit.id}, this.value)">
                    ${this.generateScoreOptions(crit.diem, crit.diem, false)}
                  </select>
                  <button type="button" class="note-icon-btn" id="btn-note-toggle-${crit.id}" title="Ghi chú" onclick="InspectionForm.toggleCriterionNoteBox(${crit.id})">
                    ${Icons.edit('icon-xs')}
                  </button>
                </div>
              </div>

              <div class="criterion-controls-row">
                <!-- Segmented 3 nút Đạt / Không đạt / KAP (>=44x44px) -->
                <div class="segmented-control" role="group" aria-label="Đánh giá tiêu chuẩn ${itemNumber}">
                  <button type="button" class="seg-btn seg-btn-pass" id="btn-pass-${crit.id}" onclick="InspectionForm.setCriterionStatus(${crit.id}, 'ACHIEVED')">
                    ${Icons.check('icon-sm')}
                    <span>Đạt</span>
                  </button>
                  <button type="button" class="seg-btn seg-btn-fail" id="btn-fail-${crit.id}" onclick="InspectionForm.setCriterionStatus(${crit.id}, 'FAILED')">
                    ${Icons.x('icon-sm')}
                    <span>Không đạt</span>
                  </button>
                  <button type="button" class="seg-btn seg-btn-na" id="btn-na-${crit.id}" onclick="InspectionForm.setCriterionStatus(${crit.id}, 'NA')">
                    ${Icons.minus('icon-sm')}
                    <span>KAP</span>
                  </button>
                </div>
              </div>

              <!-- Ô Ghi chú (Chỉ hiện khi FAILED hoặc khi người chấm bấm + Ghi chú) -->
              <div class="criterion-note-box" id="note-box-${crit.id}" style="display:none;">
                <input type="text" class="note-input" id="note-input-${crit.id}"
                       placeholder="Nhập cụ thể lý do không đạt (Bắt buộc)..."
                       autocomplete="off"
                       oninput="InspectionForm.onDefectNoteChange(${crit.id}, this.value)" />
                <div class="dlp-alert" id="dlp-alert-${crit.id}"></div>
              </div>
            </div>
          `;
        });
      });

      // Chân chặng (Subtotal)
      stagesHtml += `
            <div class="stage-subtotal-bar" id="stage-subtotal-${stgIdx}">
              <span class="subtotal-title">Tổng điểm ${stg.name}:</span>
              <div>
                <span class="subtotal-points" id="stage-subtotal-pts-${stgIdx}">${formatScore(stg.points)} / ${formatScore(stg.points)}đ</span>
                <span class="subtotal-rate" id="stage-subtotal-rate-${stgIdx}">(100,0%)</span>
              </div>
            </div>
          </div>
        </section>
      `;
    });

    container.innerHTML = stagesHtml;
    if (stageChipsContainer) stageChipsContainer.innerHTML = chipsHtml;
  },

  scrollToStage(stageName) {
    const cleanName = stageName.replace(/\s+/g, '');
    const el = document.getElementById(`stage-section-${cleanName}`);
    if (el) {
      // Đảm bảo accordion đang mở
      const body = el.querySelector('.stage-body');
      if (body && body.style.display === 'none') {
        body.style.display = 'block';
      }
      const yOffset = -120;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  },

  scrollToCriterion(criterionId) {
    const row = document.getElementById(`crit-row-${criterionId}`);
    if (row) {
      const stageBody = row.closest('.stage-body');
      if (stageBody && stageBody.style.display === 'none') {
        stageBody.style.display = 'block';
      }

      // Đóng bottom sheet nếu đang mở trên mobile
      this.toggleBottomSheet(false);

      const yOffset = -130;
      const y = row.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });

      // Hiệu ứng pulse highlight nhẹ nhàng
      row.style.transition = 'box-shadow 0.2s ease, border-color 0.2s ease';
      row.style.boxShadow = '0 0 0 3px var(--status-danger)';
      row.style.borderColor = 'var(--status-danger)';
      setTimeout(() => {
        row.style.boxShadow = '';
        row.style.borderColor = '';
      }, 2000);
    }
  },

  toggleStageAccordion(headerEl) {
    const body = headerEl.nextElementSibling;
    const chevron = headerEl.querySelector('.stage-chevron');
    if (body.style.display === 'none') {
      body.style.display = 'block';
      if (chevron) chevron.innerHTML = Icons.chevronDown('icon-sm');
    } else {
      body.style.display = 'none';
      if (chevron) chevron.innerHTML = Icons.chevronUp('icon-sm');
    }
  },

  toggleCriterionNoteBox(criterionId) {
    const box = document.getElementById(`note-box-${criterionId}`);
    const input = document.getElementById(`note-input-${criterionId}`);
    if (!box) return;

    if (box.style.display === 'none') {
      box.style.display = 'block';
      if (input) input.focus();
    } else {
      // Chỉ ẩn nếu không phải là FAILED và không có nội dung ghi chú
      const state = this.scoresState[criterionId];
      if (state && state.status !== 'FAILED' && (!state.defect_note || state.defect_note.trim() === '')) {
        box.style.display = 'none';
      }
    }
  },

  resetForm() {
    this.currentRoundId = null;
    this.scoresState = {};
    
    // Đặt thời gian hiện tại vào input
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const isoString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dtInput = document.getElementById('inspect-datetime-local');
    const hiddenTime = document.getElementById('inspect-time');
    
    if (dtInput) dtInput.value = isoString;
    if (hiddenTime) {
      hiddenTime.value = `${pad(now.getHours())}:${pad(now.getMinutes())} ${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
    }

    const deptSelect = document.getElementById('inspect-dept-select');
    if (deptSelect) deptSelect.value = '';
    
    const headNurse = document.getElementById('inspect-head-nurse');
    if (headNurse) headNurse.value = '';
    this.clearAllInspectors();

    const seriousCb = document.getElementById('serious-violation-cb');
    if (seriousCb) {
      seriousCb.checked = false;
      this.onSeriousViolationChange(false);
    }

    // Mặc định ban đầu: Tất cả 63 tiêu chuẩn con ở trạng thái Đạt (100% full điểm)
    this.criteria.forEach(crit => {
      this.scoresState[crit.id] = {
        status: 'ACHIEVED',
        awarded_score: crit.diem,
        defect_note: ''
      };
      this.updateCriterionUI(crit.id);
    });

    this.recalculateScores();
    this.updateExportButtonsState(false);
    this.updateMetaSummaryBadge();
  },

  generateScoreOptions(maxScore, currentScore, isNa) {
    const valuesSet = new Set();
    
    // Thêm các mốc 0.25 (phổ biến nhất trong chấm kiểm tra y tế bệnh viện)
    for (let s = maxScore; s >= -0.001; s -= 0.25) {
      valuesSet.add(Math.round(s * 100) / 100);
    }
    
    // Thêm các mốc 0.10 (phục vụ barem chấm lẻ)
    for (let s = maxScore; s >= -0.001; s -= 0.10) {
      valuesSet.add(Math.round(s * 100) / 100);
    }

    valuesSet.add(0.00);

    // Đảm bảo điểm số hiện tại luôn có trong danh sách
    if (typeof currentScore === 'number' && !isNaN(currentScore) && currentScore >= 0 && currentScore <= maxScore) {
      valuesSet.add(Math.round(currentScore * 100) / 100);
    }

    const sortedVals = Array.from(valuesSet).sort((a, b) => b - a);

    let html = '';
    if (isNa) {
      html += `<option value="NA" selected>— (KAP)</option>`;
    }

    sortedVals.forEach(val => {
      const isSelected = !isNa && Math.abs(val - currentScore) < 0.005;
      const valStr = val.toFixed(2);
      const displayScore = `${valStr.replace('.', ',')}đ`;
      const label = val >= maxScore ? `${displayScore} (Đạt)` : `${displayScore} (Không đạt)`;
      html += `<option value="${valStr}" ${isSelected ? 'selected' : ''}>${label}</option>`;
    });

    if (!isNa) {
      html += `<option value="NA">— (KAP)</option>`;
    }

    return html;
  },

  onCriterionScoreChange(criterionId, selectedValue) {
    const crit = this.criteria.find(c => c.id === criterionId);
    if (!crit) return;

    if (selectedValue === 'NA') {
      this.setCriterionStatus(criterionId, 'NA');
      return;
    }

    const score = parseFloat(selectedValue);
    if (isNaN(score)) return;

    // Quy tắc: điểm tối đa thì tiêu chuẩn đó đạt, còn thấp hơn điểm chuẩn là không đạt
    if (score >= crit.diem) {
      this.setCriterionStatus(criterionId, 'ACHIEVED', crit.diem);
    } else {
      this.setCriterionStatus(criterionId, 'FAILED', score);
    }
  },

  setCriterionStatus(criterionId, newStatus, customScore = null) {
    const crit = this.criteria.find(c => c.id === criterionId);
    if (!crit) return;

    if (!this.scoresState[criterionId]) {
      this.scoresState[criterionId] = { status: 'ACHIEVED', awarded_score: crit.diem, defect_note: '' };
    }

    const state = this.scoresState[criterionId];
    state.status = newStatus;

    if (customScore !== null && typeof customScore === 'number' && !isNaN(customScore)) {
      state.awarded_score = Math.round(customScore * 100) / 100;
    } else {
      if (newStatus === 'ACHIEVED') {
        state.awarded_score = crit.diem;
      } else if (newStatus === 'FAILED') {
        state.awarded_score = 0.0;
      } else if (newStatus === 'NA') {
        state.awarded_score = 0.0;
      }
    }

    this.updateCriterionUI(criterionId);
    this.recalculateScores();
    this.updateDeficienciesList();
  },

  updateCriterionUI(criterionId) {
    const state = this.scoresState[criterionId];
    const crit = this.criteria.find(c => c.id === criterionId);
    if (!state || !crit) return;

    const row = document.getElementById(`crit-row-${criterionId}`);
    const btnPass = document.getElementById(`btn-pass-${criterionId}`);
    const btnFail = document.getElementById(`btn-fail-${criterionId}`);
    const btnNa = document.getElementById(`btn-na-${criterionId}`);
    const noteBox = document.getElementById(`note-box-${criterionId}`);
    const noteInput = document.getElementById(`note-input-${criterionId}`);
    const btnNoteToggle = document.getElementById(`btn-note-toggle-${criterionId}`);

    // Update segmented buttons
    if (btnPass) btnPass.classList.toggle('active', state.status === 'ACHIEVED');
    if (btnFail) btnFail.classList.toggle('active', state.status === 'FAILED');
    if (btnNa) btnNa.classList.toggle('active', state.status === 'NA');

    // Update row highlighting
    if (row) {
      row.classList.toggle('row-failed', state.status === 'FAILED');
    }

    // Update note input & container visibility
    if (noteBox) {
      if (state.status === 'FAILED' || state.status === 'NA') {
        noteBox.style.display = 'block';
        if (noteInput) {
          if (state.status === 'FAILED') {
            noteInput.classList.add('state-failed');
            noteInput.placeholder = 'Nhập cụ thể lý do không đạt (Bắt buộc)...';
          } else {
            noteInput.classList.remove('state-failed');
            noteInput.placeholder = 'Lý do không áp dụng (KAP)...';
          }
        }
      } else {
        if (state.defect_note && state.defect_note.trim() !== '') {
          noteBox.style.display = 'block';
        } else {
          noteBox.style.display = 'none';
        }
        if (noteInput) {
          noteInput.classList.remove('state-failed');
          noteInput.placeholder = 'Ghi chú thêm nếu có...';
        }
      }
    }

    if (noteInput && state.defect_note !== undefined && noteInput.value !== state.defect_note) {
      noteInput.value = state.defect_note;
    }

    // Cập nhật ô cuộn chọn / chip Điểm thực tế thời gian thực
    const actualChip = document.getElementById(`crit-actual-chip-${criterionId}`);
    if (actualChip) {
      if (actualChip.tagName === 'SELECT') {
        const isNa = state.status === 'NA';
        const curScore = isNa ? 0.0 : (typeof state.awarded_score === 'number' ? state.awarded_score : (state.status === 'ACHIEVED' ? crit.diem : 0.0));
        actualChip.innerHTML = this.generateScoreOptions(crit.diem, curScore, isNa);
        if (isNa) {
          actualChip.value = 'NA';
          actualChip.className = 'criterion-actual-select criterion-actual-chip status-na';
        } else if (state.status === 'ACHIEVED') {
          actualChip.value = crit.diem.toFixed(2);
          actualChip.className = 'criterion-actual-select criterion-actual-chip status-achieved';
        } else {
          actualChip.value = curScore.toFixed(2);
          actualChip.className = 'criterion-actual-select criterion-actual-chip status-failed';
        }
      } else {
        if (state.status === 'ACHIEVED') {
          actualChip.textContent = `${formatScore(crit.diem)}đ`;
          actualChip.className = 'criterion-actual-chip status-achieved';
        } else if (state.status === 'FAILED') {
          actualChip.textContent = `${formatScore(state.awarded_score || 0)}đ`;
          actualChip.className = 'criterion-actual-chip status-failed';
        } else if (state.status === 'NA') {
          actualChip.textContent = '—';
          actualChip.className = 'criterion-actual-chip status-na';
        }
      }
    }
  },

  onDefectNoteChange(criterionId, noteText) {
    if (!this.scoresState[criterionId]) return;
    this.scoresState[criterionId].defect_note = noteText;

    // Quét bảo vệ Zero-PHI DLP
    this.checkDLP(noteText, `dlp-alert-${criterionId}`);
    this.updateDeficienciesList();
  },

  checkDLP(text, alertElId) {
    const alertEl = document.getElementById(alertElId);
    if (!alertEl) return;

    // Nhận diện số điện thoại (10 chữ số) hoặc định dạng mã bệnh án
    const phoneRegex = /\b(0[3|5|7|8|9][0-9]{8})\b/;
    const patientCodeRegex = /\b(BA[0-9]{6,}|BN[0-9]{6,}|HS[0-9]{6,})\b/i;

    if (phoneRegex.test(text) || patientCodeRegex.test(text)) {
      alertEl.textContent = 'Cảnh báo Zero-PHI: Phát hiện số điện thoại hoặc mã hồ sơ bệnh án. Vui lòng xóa thông tin nhận danh người bệnh.';
      alertEl.classList.add('active');
    } else {
      alertEl.textContent = '';
      alertEl.classList.remove('active');
    }
  },

  batchSetStage(stageName, targetAction) {
    const stageCriteria = this.criteria.filter(c => c.chang === stageName);
    stageCriteria.forEach(c => {
      if (targetAction === 'FULL') {
        this.setCriterionStatus(c.id, 'ACHIEVED');
      } else if (targetAction === 'NA') {
        this.setCriterionStatus(c.id, 'NA');
      }
    });

    App.showToast(`Đã gán ${targetAction === 'FULL' ? 'Đạt' : 'KAP'} toàn bộ ${stageName}`, 'info');
  },

  applyDepartmentPresetKAP(dept) {
    if (!dept || !dept.kap_preset_json) return;
    try {
      const kapIds = JSON.parse(dept.kap_preset_json);
      const noticeBar = document.getElementById('department-preset-notice');
      const noticeText = document.getElementById('preset-notice-text');

      if (Array.isArray(kapIds) && kapIds.length > 0) {
        kapIds.forEach(id => {
          this.setCriterionStatus(id, 'NA');
        });

        if (noticeBar) noticeBar.style.display = 'flex';
        if (noticeText) {
          noticeText.textContent = `Khoa ${dept.name}: Đã tự động gợi ý Không áp dụng ${kapIds.length} tiêu chuẩn con đặc thù.`;
        }
      } else {
        if (noticeBar) noticeBar.style.display = 'none';
      }
    } catch (e) {
      console.warn('Lỗi đọc preset KAP:', e);
    }
  },

  onSeriousViolationChange(isChecked) {
    const details = document.getElementById('serious-violation-details');
    if (details) {
      details.style.display = isChecked ? 'block' : 'none';
    }
    this.recalculateScores();
  },

  recalculateScores() {
    let totalAchieved = 0;
    let totalStandard = 0;
    let totalKap = 0;
    let countAchieved = 0;
    let countFailed = 0;
    let countNa = 0;

    const stagesProgressData = [];

    this.stagesMeta.forEach((stg, stgIdx) => {
      const stageCriteria = this.criteria.filter(c => c.chang === stg.name);
      let stgAchieved = 0;
      let stgKap = 0;
      let stgEvaluatedCount = 0;

      stageCriteria.forEach(c => {
        const state = this.scoresState[c.id];
        totalStandard += c.diem;

        if (state) {
          stgEvaluatedCount++;
          if (state.status === 'NA') {
            totalKap += c.diem;
            stgKap += c.diem;
            countNa++;
          } else {
            const aw = typeof state.awarded_score === 'number' ? state.awarded_score : 0;
            totalAchieved += aw;
            stgAchieved += aw;
            if (state.status === 'ACHIEVED') {
              countAchieved++;
            } else {
              countFailed++;
            }
          }
        }
      });

      stgAchieved = Math.round(stgAchieved * 100) / 100;
      const stgEffectiveDen = stg.points - stgKap;
      let stgRate = 0;
      if (stgEffectiveDen > 0) {
        stgRate = Math.round((stgAchieved / stgEffectiveDen * 100) * 10) / 10;
      }

      const stgAchievedStr = formatScore(stgAchieved);
      const stgDenStr = formatScore(stgEffectiveDen);
      const stgRateStr = stgRate.toFixed(1).replace('.', ',') + '%';

      // Cập nhật Footer chặng
      const subtotalPtsEl = document.getElementById(`stage-subtotal-pts-${stgIdx}`);
      const subtotalRateEl = document.getElementById(`stage-subtotal-rate-${stgIdx}`);
      if (subtotalPtsEl) subtotalPtsEl.textContent = `${stgAchievedStr} / ${stgDenStr}đ`;
      if (subtotalRateEl) subtotalRateEl.textContent = `(${stgRateStr})`;

      // Cập nhật Header Chặng
      const badgeProgressEl = document.getElementById(`stage-progress-badge-${stgIdx}`);
      if (badgeProgressEl) {
        badgeProgressEl.textContent = `(${stgEvaluatedCount}/${stageCriteria.length} đã chấm)`;
      }

      // Cập nhật Stage Chip trên Stage Jump Bar
      const chipEl = document.getElementById(`stage-chip-${stgIdx}`);
      const chipIconEl = document.getElementById(`chip-status-icon-${stgIdx}`);
      const isStageDone = stgEvaluatedCount === stageCriteria.length;
      if (chipEl) {
        chipEl.classList.toggle('stage-chip-done', isStageDone);
      }
      if (chipIconEl) {
        chipIconEl.innerHTML = isStageDone ? Icons.check('icon-sm') : '';
      }

      stagesProgressData.push({
        name: stg.name,
        evaluated: stgEvaluatedCount,
        total: stageCriteria.length,
        isDone: isStageDone
      });
    });

    // 2. Tính tỷ lệ tuân thủ toàn viện
    totalAchieved = Math.round(totalAchieved * 100) / 100;
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
      rating = 'KHÔNG ĐẠT';
      ratingCode = 'khong_dat';
    } else {
      if (complianceRate >= 90.0) {
        rating = 'Đạt';
        ratingCode = 'dat';
      } else if (complianceRate >= 80.0) {
        rating = 'Tốt';
        ratingCode = 'tot';
      } else if (complianceRate >= 70.0) {
        rating = 'Cần cải tiến';
        ratingCode = 'cai_tien';
      } else {
        rating = 'KHÔNG ĐẠT';
        ratingCode = 'khong_dat';
      }
    }

    const totalAchievedStr = formatScore(totalAchieved);
    const totalDenStr = formatScore(effectiveDenominator);
    const rateStr = complianceRate.toFixed(1).replace('.', ',') + '%';

    // 3. Cập nhật Desktop Sticky Summary Panel
    const dtPoints = document.getElementById('desktop-score-points');
    const dtRate = document.getElementById('desktop-score-rate');
    const dtRatingBadge = document.getElementById('desktop-rating-badge');
    const dtRatingText = document.getElementById('desktop-rating-text');
    const dtRatingIcon = document.getElementById('desktop-rating-icon');
    const dtDefectsCount = document.getElementById('desktop-defects-count');
    const dtStagesList = document.getElementById('desktop-stages-progress-list');

    if (dtPoints) dtPoints.textContent = `${totalAchievedStr} / ${totalDenStr} điểm`;
    if (dtRate) dtRate.textContent = rateStr;
    if (dtRatingBadge) {
      dtRatingBadge.className = `rating-pill ${ratingCode}`;
      if (dtRatingText) dtRatingText.textContent = rating;
      if (dtRatingIcon) {
        dtRatingIcon.innerHTML = ratingCode === 'khong_dat' ? Icons.alertTriangle('icon-sm') : Icons.check('icon-sm');
      }
    }
    if (dtDefectsCount) dtDefectsCount.textContent = countFailed;

    if (dtStagesList) {
      let stagesHtml = '';
      stagesProgressData.forEach(s => {
        stagesHtml += `
          <div class="stage-progress-item ${s.isDone ? 'done' : ''}">
            <span>${s.name}</span>
            <span>${s.evaluated}/${s.total} ${s.isDone ? Icons.check('icon-sm') : ''}</span>
          </div>
        `;
      });
      dtStagesList.innerHTML = stagesHtml;
    }

    // 4. Cập nhật Mobile Sticky Bar & Bottom Sheet
    const mbRate = document.getElementById('mobile-bar-rate');
    const mbRating = document.getElementById('mobile-bar-rating');
    const mbDefects = document.getElementById('mobile-bar-defects');

    if (mbRate) mbRate.textContent = rateStr;
    if (mbRating) {
      mbRating.textContent = rating;
      mbRating.className = `rating-pill-sm ${ratingCode}`;
    }
    if (mbDefects) mbDefects.textContent = `${countFailed} KĐ`;

    const sheetRate = document.getElementById('sheet-score-rate');
    const sheetRatingPill = document.getElementById('sheet-rating-pill');
    const sheetPoints = document.getElementById('sheet-score-points');
    const sheetDefectsCount = document.getElementById('sheet-defects-count');

    if (sheetRate) sheetRate.textContent = rateStr;
    if (sheetRatingPill) {
      sheetRatingPill.textContent = rating;
      sheetRatingPill.className = `rating-pill ${ratingCode}`;
    }
    if (sheetPoints) sheetPoints.textContent = `${totalAchievedStr} / ${totalDenStr}đ`;
    if (sheetDefectsCount) sheetDefectsCount.textContent = `${countFailed} tiêu chuẩn`;

    // 5. Cập nhật Danh sách Không đạt (Interactive Defect Links)
    this.renderDefectsList();

    const result = {
      achieved: totalAchieved,
      max: effectiveDenominator,
      rate: complianceRate,
      rating: rating,
      rating_code: ratingCode,
      failed_count: countFailed
    };
    this.lastCalculatedScores = result;
    this.populatePrintSheet();
    return result;
  },

  calculateCompliance() {
    if (this.lastCalculatedScores) {
      return this.lastCalculatedScores;
    }
    return this.recalculateScores();
  },

  renderDefectsList() {
    const desktopList = document.getElementById('desktop-defects-list');
    const sheetList = document.getElementById('sheet-defects-list');

    const failedItems = [];
    this.criteria.forEach(c => {
      const state = this.scoresState[c.id];
      if (state && state.status === 'FAILED') {
        failedItems.push({
          id: c.id,
          muc_stt: c.muc_stt,
          muc_ten: c.muc_ten,
          note: state.defect_note || 'Chưa ghi chú'
        });
      }
    });

    const buildHtml = () => {
      if (failedItems.length === 0) {
        return '<div class="empty-defects-note">Không có tiêu chuẩn bị trừ điểm</div>';
      }
      return failedItems.map(item => `
        <a class="defect-item-link" onclick="InspectionForm.scrollToCriterion(${item.id}); return false;">
          <span>${Icons.x('icon-sm')}</span>
          <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Mục ${item.muc_stt}: ${item.note}</span>
        </a>
      `).join('');
    };

    if (desktopList) desktopList.innerHTML = buildHtml();
    if (sheetList) sheetList.innerHTML = buildHtml();
  },

  updateDeficienciesList() {
    const listEl = document.getElementById('corrective-deficiencies');
    if (!listEl) return;

    const failedItems = [];
    this.criteria.forEach(c => {
      const state = this.scoresState[c.id];
      if (state && state.status === 'FAILED') {
        const note = state.defect_note ? `: ${state.defect_note}` : '';
        const actualFormatted = formatScore(state.awarded_score || 0);
        failedItems.push(`- Mục ${c.muc_stt} (${c.muc_ten}) [${actualFormatted}/${formatScore(c.diem)}đ]${note}`);
      }
    });

    if (failedItems.length > 0) {
      listEl.value = failedItems.join('\n');
    } else {
      listEl.value = '- Không có tồn tại ghi nhận (Đạt chuẩn toàn bộ).';
    }
    this.autoResizeDeficiencies();
    this.populatePrintSheet();
  },

  autoResizeDeficiencies() {
    const el = document.getElementById('corrective-deficiencies');
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight + 2) + 'px';
  },

  populatePrintSheet() {
    const printSheet = document.getElementById('print-sheet');
    if (!printSheet) return;

    // Thông tin chung
    const deptSelect = document.getElementById('inspect-dept-select');
    const deptName = (deptSelect && deptSelect.selectedIndex > 0)
      ? deptSelect.options[deptSelect.selectedIndex].text.replace(/^\d+[\.\s]*/, '').trim()
      : 'Khoa được giám sát';
    const inspectTime = document.getElementById('inspect-time')?.value || '';
    const headNurse = document.getElementById('inspect-head-nurse')?.value || '';

    // Thành viên giám sát (mỗi người 1 dòng)
    const rawInspectors = document.getElementById('inspect-inspectors')?.value || '';
    const inspectorLines = rawInspectors
      .split(/[\n,;]+/)
      .map(l => l.replace(/^\d+[\.\s\-\)]*/, '').trim())
      .filter(Boolean);
    const inspectorsHtml = inspectorLines.length > 0
      ? inspectorLines.map(name => `<div>${name}</div>`).join('')
      : '<div>Đoàn Giám sát</div>';

    // Tính toán điểm số
    const calc = this.lastCalculatedScores || {
      achieved: 100,
      max: 100,
      rate: 100,
      rating: 'Đạt'
    };
    const achievedStr = formatScore(calc.achieved);
    const maxStr = formatScore(calc.max);
    const rateStr = calc.rate.toFixed(1).replace('.', ',');
    const ratingText = document.getElementById('desktop-rating-text')?.textContent || calc.rating || 'Đạt';

    // 63 dòng tiêu chuẩn con theo 5 chặng
    let tableRowsHtml = '';
    this.stagesMeta.forEach((stg) => {
      // Hàng tiêu đề chặng I - V
      tableRowsHtml += `
        <tr class="print-stage-header-row">
          <td colspan="6" class="print-stage-title-cell">
            ${stg.name.toUpperCase()}. ${stg.title.toUpperCase()} (${formatScore(stg.points)} ĐIỂM)
          </td>
        </tr>
      `;

      const stgCriteria = this.criteria.filter(c => c.chang === stg.name);
      stgCriteria.forEach((crit, idx) => {
        const state = this.scoresState[crit.id] || { status: 'ACHIEVED', defect_note: '' };
        const itemNumber = `${crit.muc_stt}.${idx + 1}`;

        let actualScoreStr = '';
        let noteStr = state.defect_note || '';

        if (state.status === 'ACHIEVED') {
          actualScoreStr = formatScore(crit.diem);
        } else if (state.status === 'FAILED') {
          actualScoreStr = formatScore(state.awarded_score || 0);
        } else if (state.status === 'NA') {
          actualScoreStr = 'KAP';
          if (!noteStr) noteStr = 'Không áp dụng';
        }

        tableRowsHtml += `
          <tr class="print-data-row">
            <td class="print-cell-center">${itemNumber}</td>
            <td class="print-cell-left print-cell-bold">${crit.muc_ten}</td>
            <td class="print-cell-left">${crit.noi_dung}</td>
            <td class="print-cell-center">${formatScore(crit.diem)}</td>
            <td class="print-cell-center print-cell-bold">${actualScoreStr}</td>
            <td class="print-cell-left">${noteStr}</td>
          </tr>
        `;
      });
    });

    // Dòng tổng
    const totalRowHtml = `
      <tr class="print-total-row">
        <td colspan="3" class="print-cell-right print-cell-bold">
          Tổng điểm đạt: ${achievedStr} / ${maxStr} điểm
        </td>
        <td colspan="3" class="print-cell-left print-cell-bold" style="white-space: nowrap;">
          Tỷ lệ: ${rateStr}% — Xếp loại: ${ratingText}
        </td>
      </tr>
    `;

    // Tồn tại / Sai sót (in ĐỦ toàn bộ dòng, văn bản thường, không textarea)
    const deficienciesText = document.getElementById('corrective-deficiencies')?.value || '';
    const defLines = deficienciesText.split('\n').filter(l => l.trim().length > 0);
    const defHtml = defLines.length > 0
      ? defLines.map(line => `<div class="print-plan-line">${line}</div>`).join('')
      : '<div class="print-plan-line">- Không có tồn tại, sai sót quy trình nào ghi nhận.</div>';

    // Kế hoạch khắc phục
    const measuresText = document.getElementById('corrective-measures')?.value || 'Tiếp tục duy trì và phát huy quy trình chuyên môn.';
    const deadlineText = document.getElementById('corrective-deadline')?.value || 'Ngày 30.10.2026';

    // Khối chữ ký 3 cột
    const inspectorSignaturesHtml = inspectorLines.length > 0
      ? inspectorLines.map(name => `<div>${name}</div>`).join('')
      : '<div>(Ký và ghi rõ họ tên)</div>';

    printSheet.innerHTML = `
      <!-- a) Đầu phiếu -->
      <div class="print-header-grid">
        <div class="print-header-left">
          <div class="print-subhead-bold">BỆNH VIỆN BÌNH DÂN</div>
          <div class="print-subhead-bold">PHÒNG ĐIỀU DƯỠNG</div>
        </div>
        <div class="print-header-right">
          <div><strong>Mã biểu mẫu:</strong> BK-GS-ĐD.01</div>
          <div>Ban hành: 2026 | Lần BH: 02</div>
        </div>
      </div>

      <div class="print-title-block">
        <h2 class="print-doc-title">BẢNG KIỂM GIÁM SÁT CHUYÊN MÔN ĐIỀU DƯỠNG</h2>
        <div class="print-doc-subtitle">(Áp dụng kiểm tra giám sát, định kỳ và đột xuất)</div>
        <div class="print-doc-formula">* Công thức tính tỷ lệ tuân thủ (%): Tỷ lệ (%) = [ Tổng điểm Đạt / (100 - Tổng điểm các mục không áp dụng) ] x 100%</div>
      </div>

      <div class="print-meta-box">
        <table class="print-meta-table">
          <tr>
            <td style="width: 50%;"><strong>Khoa được giám sát:</strong> ${deptName}</td>
            <td style="width: 50%;"><strong>Thời gian:</strong> ${inspectTime}</td>
          </tr>
          <tr>
            <td style="vertical-align: top;"><strong>ĐD Trưởng khoa:</strong> ${headNurse}</td>
            <td style="vertical-align: top;">
              <strong>Thành viên giám sát:</strong>
              <div class="print-inspectors-col">${inspectorsHtml}</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- b) Bảng 63 dòng tiêu chuẩn con -->
      <table class="print-criteria-table">
        <thead>
          <tr>
            <th style="width: 5%;">STT</th>
            <th style="width: 25%;">Nội dung & tiêu chí</th>
            <th style="width: 38%;">Tiêu chuẩn đánh giá</th>
            <th style="width: 9%; white-space: nowrap;">Điểm chuẩn</th>
            <th style="width: 10%; white-space: nowrap;">Điểm thực tế</th>
            <th style="width: 13%;">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
          ${totalRowHtml}
        </tbody>
      </table>

      <!-- d) Bảng Tồn tại / Kế hoạch khắc phục -->
      <table class="print-plan-table">
        <thead>
          <tr>
            <th style="width: 50%;">1. TỒN TẠI / SAI SÓT GHI NHẬN TẠI KHOA</th>
            <th style="width: 50%;">2. KẾ HOẠCH HÀNH ĐỘNG / KHẮC PHỤC</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="print-plan-cell">
              ${defHtml}
            </td>
            <td class="print-plan-cell">
              <div class="print-plan-line"><strong>- Biện pháp:</strong> ${measuresText}</div>
              <div class="print-plan-line" style="margin-top: 6px;"><strong>- Thời hạn hoàn thành:</strong> ${deadlineText}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- e) Khối chữ ký 3 cột -->
      <div class="print-signatures-block">
        <table class="print-signatures-table">
          <thead>
            <tr>
              <th style="width: 33.33%;">
                THÀNH VIÊN GIÁM SÁT<br>
                <span class="print-sig-sub">(Ký và ghi rõ họ tên)</span>
              </th>
              <th style="width: 33.33%;">
                ĐIỀU DƯỠNG TRƯỞNG KHOA<br>
                <span class="print-sig-sub">(Ký và ghi rõ họ tên)</span>
              </th>
              <th style="width: 33.34%;">
                TRƯỞNG PHÒNG ĐIỀU DƯỠNG<br>
                <span class="print-sig-sub">(Duyệt và ký tên)</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="print-sig-cell">
                <div class="print-sig-space"></div>
                <div class="print-sig-names">${inspectorSignaturesHtml}</div>
              </td>
              <td class="print-sig-cell">
                <div class="print-sig-space"></div>
                <div class="print-sig-names"><strong>${headNurse}</strong></div>
              </td>
              <td class="print-sig-cell">
                <div class="print-sig-space"></div>
                <div class="print-sig-names"></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  },

  toggleBottomSheet(open) {
    const backdrop = document.getElementById('mobile-bottom-sheet-backdrop');
    const sheet = document.getElementById('mobile-bottom-sheet');
    if (!sheet) return;

    if (open) {
      if (backdrop) backdrop.removeAttribute('hidden');
      sheet.removeAttribute('hidden');
    } else {
      if (backdrop) backdrop.setAttribute('hidden', '');
      sheet.setAttribute('hidden', '');
    }
  },

  async submitInspection(targetStatus) {
    const deptSelect = document.getElementById('inspect-dept-select');
    const inspectType = document.getElementById('inspect-type').value;
    const inspectTime = document.getElementById('inspect-time').value;
    const headNurse = document.getElementById('inspect-head-nurse').value;
    const inspectors = document.getElementById('inspect-inspectors').value;

    if (!deptSelect.value) {
      App.showToast('Vui lòng chọn khoa cần giám sát', 'error');
      deptSelect.focus();
      return;
    }

    if (targetStatus === 'hoan_tat' && (!headNurse || !inspectors)) {
      App.showToast('Vui lòng điền đủ tên ĐD Trưởng khoa và Đoàn giám sát', 'error');
      return;
    }

    const seriousCb = document.getElementById('serious-violation-cb');
    const isSerious = seriousCb ? seriousCb.checked : false;

    // Chi tiết 63 dòng con
    const details = this.criteria.map(c => {
      const state = this.scoresState[c.id] || { status: 'ACHIEVED', awarded_score: c.diem, defect_note: '' };
      const awardedVal = state.status === 'NA' ? 0.0 : (typeof state.awarded_score === 'number' ? state.awarded_score : (state.status === 'ACHIEVED' ? c.diem : 0.0));
      return {
        criterion_id: c.id,
        status: state.status,
        awarded_score: Math.round(awardedVal * 100) / 100,
        defect_note: state.defect_note || ''
      };
    });

    const payload = {
      department_id: parseInt(deptSelect.value),
      loai_dot: inspectType,
      quarter: App.currentQuarter || 4,
      year: App.currentYear,
      inspection_time: inspectTime || '14:30 15.10.2026',
      head_nurse: headNurse || 'Đang cập nhật',
      inspectors: inspectors || 'Đoàn Giám sát',
      is_serious_violation: isSerious,
      serious_violation_type: isSerious ? document.getElementById('serious-violation-type').value : null,
      serious_violation_desc: isSerious ? document.getElementById('serious-violation-desc').value : null,
      trang_thai: targetStatus,
      details: details,
      corrective_plan: {
        deficiencies_summary: document.getElementById('corrective-deficiencies').value,
        action_measures: document.getElementById('corrective-measures').value,
        person_in_charge: headNurse || (document.getElementById('corrective-person') ? document.getElementById('corrective-person').value : '') || 'ĐD Trưởng khoa',
        deadline: document.getElementById('corrective-deadline').value
      }
    };

    this.populatePrintSheet();

    const isStaticHost = window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';
    if (!isStaticHost) {
      try {
        let res;
        if (this.currentRoundId && typeof this.currentRoundId === 'number' && this.currentRoundId < 1000000000000) {
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

        if (res && res.ok) {
          const data = await res.json();
          this.currentRoundId = data.id || data.round_id || this.currentRoundId;
          this.updateExportButtonsState(true);

          if (targetStatus === 'hoan_tat') {
            const rText = data.rating || document.getElementById('desktop-rating-text')?.textContent || 'Đạt';
            App.showToast(`Đã hoàn tất đợt kiểm tra #${this.currentRoundId}! Xếp loại: ${rText}`, 'success');
          } else {
            App.showToast(`Đã lưu nháp đợt kiểm tra #${this.currentRoundId}`, 'info');
          }
          return;
        }
      } catch (e) {
        // Offline / GitHub Pages fallback below
      }
    }

    // Save locally to localStorage
    try {
      const dept = this.departments.find(d => d.id == payload.department_id);
      const calculated = this.calculateCompliance();
      const rText = document.getElementById('desktop-rating-text')?.textContent || 'Đạt';
      let roundId = this.currentRoundId || Date.now();
      this.currentRoundId = roundId;

      let localList = [];
      try {
        localList = JSON.parse(localStorage.getItem('bd_nurse_inspections') || '[]');
      } catch (err) { localList = []; }

      const record = {
        id: roundId,
        department_id: payload.department_id,
        dept_name: dept ? dept.name : 'Khoa được giám sát',
        dept_block: dept ? dept.block : '',
        loai_dot: payload.loai_dot,
        year: App.currentYear,
        quarter: App.currentQuarter,
        inspection_time: payload.inspection_time,
        head_nurse: payload.head_nurse,
        inspectors: payload.inspectors,
        trang_thai: targetStatus,
        rating: rText,
        rating_code: this.getRatingCode(rText),
        compliance_rate: calculated.rate,
        total_score: calculated.achieved,
        max_score: calculated.max,
        is_serious_violation: payload.is_serious_violation,
        serious_violation_desc: payload.serious_violation_desc,
        details: payload.details,
        corrective_plan: payload.corrective_plan,
        updated_at: new Date().toISOString()
      };

      const existingIdx = localList.findIndex(r => r.id === roundId);
      if (existingIdx >= 0) {
        localList[existingIdx] = record;
      } else {
        localList.unshift(record);
      }
      localStorage.setItem('bd_nurse_inspections', JSON.stringify(localList));
      this.updateExportButtonsState(true);

      if (targetStatus === 'hoan_tat') {
        App.showToast(`Đã hoàn tất đợt kiểm tra #${this.currentRoundId}! Xếp loại: ${rText}`, 'success');
      } else {
        App.showToast(`Đã lưu nháp đợt kiểm tra #${this.currentRoundId}`, 'info');
      }
    } catch (e) {
      App.showToast(`Lỗi: ${e.message}`, 'error');
    }
  },

  getRatingCode(rText) {
    const s = (rText || '').toLowerCase();
    if (s.includes('tốt')) return 'tot';
    if (s.includes('không đạt')) return 'khong_dat';
    if (s.includes('cải tiến')) return 'can_cai_tien';
    return 'dat';
  },

  updateExportButtonsState(enabled) {
    const desktopGroup = document.getElementById('desktop-export-group');
    const sheetGroup = document.getElementById('sheet-export-group');
    if (desktopGroup) desktopGroup.style.display = enabled ? 'flex' : 'none';
    if (sheetGroup) sheetGroup.style.display = enabled ? 'flex' : 'none';
  },

  quickExportDOCX() {
    if (!this.currentRoundId) {
      App.showToast('Vui lòng lưu đợt kiểm tra trước khi xuất tệp', 'error');
      return;
    }
    window.open(`/api/inspections/${this.currentRoundId}/export-docx`, '_blank');
  },

  quickExportPDF() {
    if (!this.currentRoundId) {
      App.showToast('Vui lòng lưu đợt kiểm tra trước khi xuất tệp', 'error');
      return;
    }
    this.populatePrintSheet();
    window.print();
  },

  async loadExistingInspection(roundId) {
    try {
      let data = null;
      try {
        const res = await fetch(`/api/inspections/${roundId}`);
        if (res.ok) data = await res.json();
      } catch (err) {}

      if (!data) {
        const localList = JSON.parse(localStorage.getItem('bd_nurse_inspections') || '[]');
        data = localList.find(r => r.id == roundId);
      }
      if (!data) throw new Error('Không thể tải đợt kiểm tra');

      this.currentRoundId = data.id;
      App.switchTab('tab-inspection');

      document.getElementById('inspect-dept-select').value = data.department_id;
      document.getElementById('inspect-type').value = data.loai_dot;
      
      const hiddenTime = document.getElementById('inspect-time');
      if (hiddenTime) hiddenTime.value = data.inspection_time;

      // Chuyển sang datetime-local nếu parse được
      const dtInput = document.getElementById('inspect-datetime-local');
      if (dtInput && data.inspection_time) {
        const parts = data.inspection_time.split(' ');
        if (parts.length === 2) {
          const [hh, mm] = parts[0].split(':');
          const [dd, MM, yyyy] = parts[1].split('.');
          const pad = n => String(n).padStart(2, '0');
          dtInput.value = `${yyyy}-${pad(MM)}-${pad(dd)}T${pad(hh)}:${pad(mm)}`;
        }
      }

      const headNurseSelect = document.getElementById('inspect-head-nurse');
      if (headNurseSelect) {
        if (data.head_nurse && !Array.from(headNurseSelect.options).some(o => o.value === data.head_nurse)) {
          const opt = new Option(data.head_nurse, data.head_nurse, true, true);
          headNurseSelect.add(opt);
        }
        headNurseSelect.value = data.head_nurse || '';
      }
      const inspectorsEl = document.getElementById('inspect-inspectors');
      if (inspectorsEl) {
        inspectorsEl.value = data.inspectors || '';
        this.syncInspectorsFromTextarea();
      }

      const seriousCb = document.getElementById('serious-violation-cb');
      seriousCb.checked = Boolean(data.is_serious_violation);
      this.onSeriousViolationChange(seriousCb.checked);
      if (seriousCb.checked) {
        document.getElementById('serious-violation-type').value = data.serious_violation_type || '';
        document.getElementById('serious-violation-desc').value = data.serious_violation_desc || '';
      }

      // Nạp 63 dòng con
      this.scoresState = {};
      data.details.forEach(d => {
        const crit = this.criteria.find(c => c.id === d.criterion_id);
        const maxScore = crit ? crit.diem : 1;
        const awarded = d.awarded_score !== undefined && d.awarded_score !== null
          ? parseFloat(d.awarded_score)
          : (d.status === 'ACHIEVED' ? maxScore : 0.0);
        this.scoresState[d.criterion_id] = {
          status: d.status,
          awarded_score: isNaN(awarded) ? (d.status === 'ACHIEVED' ? maxScore : 0.0) : awarded,
          defect_note: d.defect_note || ''
        };
        this.updateCriterionUI(d.criterion_id);
      });

      // Kế hoạch khắc phục
      if (data.corrective_plan) {
        const defEl = document.getElementById('corrective-deficiencies');
        if (defEl) {
          defEl.value = data.corrective_plan.deficiencies_summary || '';
          this.autoResizeDeficiencies();
        }
        document.getElementById('corrective-measures').value = data.corrective_plan.action_measures || '';
        const cpEl = document.getElementById('corrective-person');
        if (cpEl) cpEl.value = data.corrective_plan.person_in_charge || '';
        document.getElementById('corrective-deadline').value = data.corrective_plan.deadline || '';
      }

      this.recalculateScores();
      this.populatePrintSheet();
      this.updateExportButtonsState(true);
      this.updateMetaSummaryBadge();
      App.showToast(`Đã nạp đợt kiểm tra #${data.id} (${data.dept_name})`, 'info');
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
    }, 60000); // Tự động lưu nháp sau mỗi 60 giây nếu có chọn khoa
  }
};

window.InspectionForm = InspectionForm;
