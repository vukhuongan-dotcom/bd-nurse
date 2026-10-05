/**
 * Dashboard & Archive Controller for BD-NURSE (Indigo Redesign)
 * HTML-native Responsive Visualizations (Zero Canvas Overflow)
 * Phê duyệt bởi BSCKII. Vũ Khương An
 */

const Dashboard = {
  dashboardData: null,
  currentBlockFilter: 'all',
  archiveData: [],

  // ==================== 1. PHÂN HỆ THỐNG KÊ (DASHBOARD) ====================
  async loadStats() {
    const isStaticHost = window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';
    if (!isStaticHost) {
      try {
        let url = `/api/stats/dashboard?year=${App.currentYear}`;
        if (App.currentQuarter) url += `&quarter=${App.currentQuarter}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          this.dashboardData = data;
          this.renderKPIs(data);
          this.renderRankingBars(data.ranking || []);
          this.renderStackedRatingBar(data.rating_distribution || {});
          this.renderTopDefects(data.top_defects || []);
          return;
        }
      } catch (e) {}
    }

    // Offline / Standalone Fallback
    const data = this.calculateLocalStats();
    this.dashboardData = data;
    this.renderKPIs(data);
    this.renderRankingBars(data.ranking || []);
    this.renderStackedRatingBar(data.rating_distribution || {});
    this.renderTopDefects(data.top_defects || []);
  },

  calculateLocalStats() {
    let localList = [];
    try {
      localList = JSON.parse(localStorage.getItem('bd_nurse_inspections') || '[]');
    } catch (e) { localList = []; }

    const filtered = localList.filter(r => {
      if (r.year && r.year !== App.currentYear) return false;
      if (App.currentQuarter && r.quarter && r.quarter !== App.currentQuarter) return false;
      return true;
    });

    const depts = (App.departments && App.departments.length > 0) ? App.departments : (window.WINDOW_DEPARTMENTS_DATA || []);
    const totalDepts = depts.length || 27;

    const latestByDept = new Map();
    filtered.forEach(r => {
      if (!latestByDept.has(r.department_id)) {
        latestByDept.set(r.department_id, r);
      }
    });

    const completed = Array.from(latestByDept.values()).filter(r => r.trang_thai === 'hoan_tat');
    const inspectedCount = completed.length;
    const progressRate = totalDepts > 0 ? (inspectedCount / totalDepts * 100) : 0;

    let sumCompliance = 0;
    const ratingDist = { tot: 0, dat: 0, can_cai_tien: 0, khong_dat: 0 };
    const ranking = [];

    completed.forEach(r => {
      sumCompliance += (r.compliance_rate || 0);
      const code = r.rating_code || 'dat';
      if (ratingDist[code] !== undefined) ratingDist[code]++;
      ranking.push({
        department_id: r.department_id,
        compliance_rate: r.compliance_rate,
        total_score: r.total_score,
        rating: r.rating,
        rating_code: r.rating_code
      });
    });

    const avgCompliance = inspectedCount > 0 ? (sumCompliance / inspectedCount) : 0;

    const defectMap = new Map();
    filtered.forEach(r => {
      (r.details || []).forEach(d => {
        if (d.status === 'FAILED') {
          const count = defectMap.get(d.criterion_id) || 0;
          defectMap.set(d.criterion_id, count + 1);
        }
      });
    });

    const criteriaList = (App.criteria && App.criteria.length > 0) ? App.criteria : (window.WINDOW_CRITERIA_DATA || []);
    const topDefects = Array.from(defectMap.entries())
      .map(([critId, failCount]) => {
        const crit = criteriaList.find(c => c.id === critId);
        return {
          id: critId,
          content: crit ? crit.content : `Tiêu chuẩn #${critId}`,
          stage: crit ? crit.stage : '',
          failed_count: failCount,
          applied_count: filtered.length,
          failed_rate: filtered.length > 0 ? Math.round((failCount / filtered.length) * 1000) / 10 : 0
        };
      })
      .sort((a, b) => b.failed_count - a.failed_count)
      .slice(0, 5);

    const overdueActions = completed.filter(r => r.rating_code === 'can_cai_tien' || r.rating_code === 'khong_dat');

    return {
      year: App.currentYear,
      quarter: App.currentQuarter,
      total_departments: totalDepts,
      inspected_departments: inspectedCount,
      progress_rate: progressRate,
      average_compliance_rate: avgCompliance,
      rating_distribution: ratingDist,
      ranking: ranking,
      top_defects: topDefects,
      overdue_actions: overdueActions
    };
  },

  renderKPIs(data) {
    const fractionEl = document.getElementById('kpi-progress-fraction');
    const percentEl = document.getElementById('kpi-progress-percent');
    const barEl = document.getElementById('kpi-progress-bar');
    const avgRateEl = document.getElementById('kpi-avg-rate');
    const avgSubEl = document.getElementById('kpi-avg-subtext');
    const nonCompliantEl = document.getElementById('kpi-non-compliant-count');
    const nonCompliantSub = document.getElementById('kpi-non-compliant-sub');
    const overdueEl = document.getElementById('kpi-overdue-count');

    const inspectedDepts = data.inspected_departments || 0;
    const totalDepts = data.total_departments || 27;
    const progRate = (data.progress_rate != null) ? data.progress_rate : ((inspectedDepts / totalDepts) * 100);

    if (fractionEl) fractionEl.textContent = `${inspectedDepts}/${totalDepts}`;
    if (percentEl) percentEl.textContent = `(${progRate.toFixed(1).replace('.', ',')}%)`;
    if (barEl) barEl.style.width = `${Math.min(100, Math.max(0, progRate))}%`;

    const avgRate = data.average_compliance_rate || 0;
    if (avgRateEl) avgRateEl.textContent = `${avgRate.toFixed(1).replace('.', ',')}%`;
    if (avgSubEl) avgSubEl.textContent = `Tính trên ${inspectedDepts} khoa đã hoàn tất giám sát`;

    const dist = data.rating_distribution || {};
    const nonCompliantCount = (dist.can_cai_tien || 0) + (dist.khong_dat || 0);
    if (nonCompliantEl) nonCompliantEl.textContent = nonCompliantCount;
    if (nonCompliantSub) nonCompliantSub.textContent = nonCompliantCount > 0 ? 'khoa cần tái giám sát' : 'khoa cần lưu ý';

    const overdueCount = (data.overdue_actions || []).length;
    if (overdueEl) overdueEl.textContent = overdueCount;
  },

  filterBlock(blockName) {
    this.currentBlockFilter = blockName;
    document.querySelectorAll('.block-filter-chips .btn-stage').forEach(b => {
      const isTarget = b.id === `btn-block-${blockName === 'all' ? 'all' : (blockName === 'Ngoại' ? 'ngoai' : (blockName === 'Nội' ? 'noi' : 'khac'))}`;
      b.classList.toggle('active', isTarget);
    });

    if (this.dashboardData) {
      this.renderRankingBars(this.dashboardData.ranking || []);
    }
  },

  async renderRankingBars(ranking) {
    const container = document.getElementById('department-ranking-container');
    if (!container) return;

    if (!App.departments || App.departments.length === 0) {
      try {
        const res = await fetch('/api/departments');
        if (res.ok) App.departments = await res.json();
      } catch (e) {}
      if (!App.departments || App.departments.length === 0) {
        if (window.WINDOW_DEPARTMENTS_DATA) {
          App.departments = window.WINDOW_DEPARTMENTS_DATA;
        } else {
          container.innerHTML = '<div style="padding:16px; color:var(--ink-2); text-align:center;">Đang tải danh sách khoa...</div>';
          return;
        }
      }
    }

    // Lọc theo khối nếu có
    let depts = App.departments || [];
    if (this.currentBlockFilter && this.currentBlockFilter !== 'all') {
      depts = depts.filter(d => (d.block || '').includes(this.currentBlockFilter));
    }

    // Mapping đợt kiểm tra theo department_id
    const rankingMap = new Map();
    ranking.forEach(r => rankingMap.set(r.department_id, r));

    // Sắp xếp: khoa đã kiểm tra (tỷ lệ giảm dần) trước, khoa chưa kiểm tra sau
    const sortedDepts = [...depts].sort((a, b) => {
      const recA = rankingMap.get(a.id);
      const recB = rankingMap.get(b.id);
      if (recA && !recB) return -1;
      if (!recA && recB) return 1;
      if (recA && recB) return (recB.compliance_rate || 0) - (recA.compliance_rate || 0);
      return a.id - b.id;
    });

    if (sortedDepts.length === 0) {
      container.innerHTML = '<div style="padding:24px; text-align:center; color:var(--ink-2); font-size:var(--text-sm);">Không có khoa nào thuộc khối này.</div>';
      return;
    }

    let html = '';
    sortedDepts.forEach((dept) => {
      const record = rankingMap.get(dept.id);
      if (record) {
        let barColor = '#15803D'; // Đạt
        if (record.rating_code === 'tot') barColor = '#0F766E';
        if (record.rating_code === 'cai_tien') barColor = '#B45309';
        if (record.rating_code === 'khong_dat') barColor = '#B91C1C';
        const rateFormatted = (record.compliance_rate || 0).toFixed(1).replace('.', ',');

        html += `
          <div class="rank-row" onclick="InspectionForm.loadExistingInspection(${record.id})" style="cursor:pointer;" title="Bấm để xem đợt kiểm tra #${record.id}">
            <span class="rank-dept-name" title="${dept.name} (${dept.block || ''})">${dept.name}</span>
            <div class="rank-bar-track">
              <div class="rank-bar-fill" style="width: ${Math.max(14, record.compliance_rate || 0)}%; background-color: ${barColor};">
                <span class="tabular-nums">${rateFormatted}%</span>
              </div>
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="rank-row">
            <span class="rank-dept-name" title="${dept.name} (${dept.block || ''})">${dept.name}</span>
            <div class="rank-bar-track">
              <span class="rank-empty-text">Chưa kiểm tra</span>
            </div>
          </div>
        `;
      }
    });

    container.innerHTML = html;
  },

  renderStackedRatingBar(dist) {
    const barEl = document.getElementById('rating-distribution-stacked-bar');
    const legendEl = document.getElementById('rating-distribution-legend');
    if (!barEl) return;

    const datCount = dist.dat || 0;
    const totCount = dist.tot || 0;
    const caiTienCount = dist.can_cai_tien || 0;
    const khongDatCount = dist.khong_dat || 0;
    const total = datCount + totCount + caiTienCount + khongDatCount;

    if (total === 0) {
      barEl.innerHTML = '<div style="width:100%; display:flex; align-items:center; justify-content:center; color:var(--ink-2); font-size:12px;">Chưa có dữ liệu kiểm tra trong kỳ này</div>';
      if (legendEl) legendEl.innerHTML = '';
      return;
    }

    const datPct = (datCount / total) * 100;
    const totPct = (totCount / total) * 100;
    const caiTienPct = (caiTienCount / total) * 100;
    const khongDatPct = (khongDatCount / total) * 100;

    barEl.innerHTML = `
      ${datPct > 0 ? `<div class="stacked-seg" style="width:${datPct}%; background-color:#15803D;" title="Đạt: ${datCount} khoa (${datPct.toFixed(1).replace('.', ',')}%)">${datPct >= 8 ? datCount : ''}</div>` : ''}
      ${totPct > 0 ? `<div class="stacked-seg" style="width:${totPct}%; background-color:#0F766E;" title="Tốt: ${totCount} khoa (${totPct.toFixed(1).replace('.', ',')}%)">${totPct >= 8 ? totCount : ''}</div>` : ''}
      ${caiTienPct > 0 ? `<div class="stacked-seg" style="width:${caiTienPct}%; background-color:#B45309;" title="Cần cải tiến: ${caiTienCount} khoa (${caiTienPct.toFixed(1).replace('.', ',')}%)">${caiTienPct >= 8 ? caiTienCount : ''}</div>` : ''}
      ${khongDatPct > 0 ? `<div class="stacked-seg" style="width:${khongDatPct}%; background-color:#B91C1C;" title="Không đạt: ${khongDatCount} khoa (${khongDatPct.toFixed(1).replace('.', ',')}%)">${khongDatPct >= 8 ? khongDatCount : ''}</div>` : ''}
    `;

    if (legendEl) {
      legendEl.innerHTML = `
        <div class="legend-item"><span class="legend-color-dot" style="background-color:#15803D;"></span><span>Đạt: <strong>${datCount}</strong> (${datPct.toFixed(1).replace('.', ',')}%)</span></div>
        <div class="legend-item"><span class="legend-color-dot" style="background-color:#0F766E;"></span><span>Tốt: <strong>${totCount}</strong> (${totPct.toFixed(1).replace('.', ',')}%)</span></div>
        <div class="legend-item"><span class="legend-color-dot" style="background-color:#B45309;"></span><span>Cần cải tiến: <strong>${caiTienCount}</strong> (${caiTienPct.toFixed(1).replace('.', ',')}%)</span></div>
        <div class="legend-item"><span class="legend-color-dot" style="background-color:#B91C1C;"></span><span>Không đạt: <strong>${khongDatCount}</strong> (${khongDatPct.toFixed(1).replace('.', ',')}%)</span></div>
      `;
    }
  },

  renderTopDefects(topDefects) {
    const container = document.getElementById('top-defects-container');
    if (!container) return;

    if (!topDefects || topDefects.length === 0) {
      container.innerHTML = '<div style="padding:16px; color:var(--ink-2); text-align:center; font-size:12px;">Không có tiêu chuẩn nào bị chấm không đạt.</div>';
      return;
    }

    let html = '';
    topDefects.slice(0, 5).forEach((d) => {
      const fullText = d.muc_ten || d.noi_dung || '';
      const rate = d.failed_rate != null ? d.failed_rate : (d.defect_rate || 0);
      const rateFormatted = rate.toFixed(1).replace('.', ',');

      html += `
        <div class="top-defect-item">
          <div class="defect-item-header">
            <span class="defect-item-title">Mục ${d.muc_stt}: ${fullText}</span>
            <span class="defect-item-rate tabular-nums">${rateFormatted}%</span>
          </div>
          <div class="defect-bar-track">
            <div class="defect-bar-fill" style="width: ${Math.min(100, Math.max(8, rate))}%;"></div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  // ==================== 2. PHÂN HỆ LỊCH SỬ (ARCHIVE) ====================
  async loadArchiveList() {
    const tableBody = document.getElementById('archive-table-body');
    const mobileList = document.getElementById('mobile-archive-list');

    if (tableBody) tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:24px; color:var(--ink-2);">Đang tải danh sách...</td></tr>';
    if (mobileList) mobileList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--ink-2);">Đang tải danh sách...</div>';

    let data = null;
    const isStaticHost = window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';
    if (!isStaticHost) {
      try {
        let url = `/api/inspections?year=${App.currentYear}`;
        if (App.currentQuarter) url += `&quarter=${App.currentQuarter}`;

        const res = await fetch(url);
        if (res.ok) data = await res.json();
      } catch (e) {}
    }

    if (!data) {
      // Fallback: LocalStorage
      let localList = [];
      try {
        localList = JSON.parse(localStorage.getItem('bd_nurse_inspections') || '[]');
      } catch (e) { localList = []; }

      data = localList.filter(r => {
        if (r.year && r.year !== App.currentYear) return false;
        if (App.currentQuarter && r.quarter && r.quarter !== App.currentQuarter) return false;
        return true;
      });
    }

    this.archiveData = data;
    this.filterArchiveTable();
  },

  renderArchive(items) {
    const tableBody = document.getElementById('archive-table-body');
    const mobileList = document.getElementById('mobile-archive-list');

    if (!items || items.length === 0) {
      const emptyHtml = `
        <div class="empty-state-card">
          ${Icons.clipboardCheck('icon-xl')}
          <div class="empty-title">Không tìm thấy đợt kiểm tra nào</div>
          <div class="empty-desc">Chưa có dữ liệu phù hợp với điều kiện tìm kiếm hoặc kỳ giám sát này.</div>
          <button type="button" class="btn-primary" onclick="InspectionForm.resetForm()">
            ${Icons.plus('icon-sm')}
            <span>Bắt đầu đợt kiểm tra mới</span>
          </button>
        </div>
      `;
      if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="9" style="padding:0;">${emptyHtml}</td></tr>`;
      }
      if (mobileList) {
        mobileList.innerHTML = emptyHtml;
      }
      return;
    }

    // Render Desktop Table (>= 1024px)
    if (tableBody) {
      tableBody.innerHTML = items.map(r => {
        const ratingCode = r.rating_code || 'dat';
        const ratingText = r.rating || 'Đạt';
        const isLocked = r.trang_thai === 'da_khoa';
        const isDraft = r.trang_thai === 'nhap' || r.trang_thai === 'DRAFT';
        const statusBadge = isLocked 
          ? `<span class="badge-status locked">${Icons.database('icon-xs')} Đã khóa</span>`
          : (isDraft 
              ? `<span class="badge-status draft">${Icons.edit('icon-xs')} Bản nháp</span>` 
              : `<span class="badge-status completed">${Icons.check('icon-xs')} Hoàn tất</span>`);

        return `
          <tr>
            <td><strong class="tabular-nums">#${r.id}</strong></td>
            <td>
              <strong>${r.dept_name || 'Khoa chưa đặt'}</strong>
              <div style="font-size:11px; color:var(--ink-2);">${r.dept_block || ''}</div>
            </td>
            <td><span class="tabular-nums">Quý ${r.quarter}/${r.year}</span></td>
            <td><span class="tabular-nums">${r.inspection_time || '—'}</span></td>
            <td>${r.head_nurse || '—'}</td>
            <td>
              <strong class="tabular-nums">${(r.compliance_rate || 0).toFixed(1).replace('.', ',')}%</strong>
              <div style="font-size:11px; color:var(--ink-2);">${r.total_achieved_score || 0}đ</div>
            </td>
            <td><span class="rating-pill-sm ${ratingCode}">${ratingText}</span></td>
            <td>${statusBadge}</td>
            <td style="text-align:right;">
              <div class="table-actions-row">
                <button type="button" class="btn-tint btn-sm" title="Xem hoặc chỉnh sửa" onclick="InspectionForm.loadExistingInspection(${r.id})">
                  ${Icons.edit('icon-xs')}
                  <span>Xem/Sửa</span>
                </button>
                <a href="/api/inspections/${r.id}/export-docx" target="_blank" class="btn-tint btn-sm" title="Tải file Word">
                  ${Icons.fileText('icon-xs')}
                  <span>Word</span>
                </a>
                <a href="/api/inspections/${r.id}/export-pdf" target="_blank" class="btn-tint btn-sm" title="Tải file PDF">
                  ${Icons.file('icon-xs')}
                  <span>PDF</span>
                </a>
                <button type="button" class="btn-icon btn-sm" title="Xóa đợt kiểm tra" onclick="Dashboard.deleteInspection(${r.id}, '${(r.dept_name || '').replace(/'/g, "\\'")}')">
                  ${Icons.trash('icon-xs')}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Render Mobile Cards (< 1024px)
    if (mobileList) {
      mobileList.innerHTML = items.map(r => {
        const ratingCode = r.rating_code || 'dat';
        const ratingText = r.rating || 'Đạt';
        const isLocked = r.trang_thai === 'da_khoa';
        const isDraft = r.trang_thai === 'nhap' || r.trang_thai === 'DRAFT';
        const statusBadge = isLocked 
          ? `<span class="badge-status locked">${Icons.database('icon-xs')} Đã khóa</span>`
          : (isDraft 
              ? `<span class="badge-status draft">${Icons.edit('icon-xs')} Bản nháp</span>` 
              : `<span class="badge-status completed">${Icons.check('icon-xs')} Hoàn tất</span>`);

        return `
          <div class="mobile-archive-card">
            <div class="mobile-card-top">
              <div>
                <span class="mobile-card-id">#${r.id}</span>
                <span class="mobile-card-title">${r.dept_name || 'Khoa chưa đặt'}</span>
              </div>
              <span class="rating-pill-sm ${ratingCode}">${ratingText}</span>
            </div>

            <div class="mobile-card-meta">
              <div><strong>Thời gian:</strong> <span class="tabular-nums">${r.inspection_time || '—'}</span></div>
              <div><strong>ĐD Trưởng:</strong> ${r.head_nurse || '—'}</div>
              <div><strong>Tỷ lệ:</strong> <span class="tabular-nums">${(r.compliance_rate || 0).toFixed(1).replace('.', ',')}% (${r.total_achieved_score || 0}đ)</span></div>
              <div><strong>Trạng thái:</strong> ${statusBadge}</div>
            </div>

            <div class="mobile-card-actions">
              <button type="button" class="btn-primary btn-sm flex-1" onclick="InspectionForm.loadExistingInspection(${r.id})">
                ${Icons.edit('icon-xs')}
                <span>Mở</span>
              </button>
              <a href="/api/inspections/${r.id}/export-docx" target="_blank" class="btn-tint btn-sm">
                ${Icons.fileText('icon-xs')}
                <span>Word</span>
              </a>
              <a href="/api/inspections/${r.id}/export-pdf" target="_blank" class="btn-tint btn-sm">
                ${Icons.file('icon-xs')}
                <span>PDF</span>
              </a>
              <button type="button" class="btn-icon btn-sm" onclick="Dashboard.deleteInspection(${r.id}, '${(r.dept_name || '').replace(/'/g, "\\'")}')">
                ${Icons.trash('icon-xs')}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  },

  filterArchiveTable() {
    const searchInput = document.getElementById('archive-search-input');
    const statusSelect = document.getElementById('archive-status-filter');
    const ratingSelect = document.getElementById('archive-rating-filter');

    const query = (searchInput?.value || '').toLowerCase().trim();
    const statusVal = statusSelect?.value || 'all';
    const ratingVal = ratingSelect?.value || 'all';

    const filtered = this.archiveData.filter(r => {
      const matchesSearch = !query || 
        (r.dept_name && r.dept_name.toLowerCase().includes(query)) ||
        (r.head_nurse && r.head_nurse.toLowerCase().includes(query)) ||
        String(r.id).includes(query);

      let matchesStatus = true;
      if (statusVal === 'hoan_tat') matchesStatus = r.trang_thai === 'hoan_tat';
      else if (statusVal === 'nhap') matchesStatus = (r.trang_thai === 'nhap' || r.trang_thai === 'DRAFT');
      else if (statusVal === 'da_khoa') matchesStatus = r.trang_thai === 'da_khoa';

      let matchesRating = true;
      if (ratingVal !== 'all') {
        matchesRating = (r.rating_code || '').toLowerCase() === ratingVal.toLowerCase() ||
                        (r.rating || '').toLowerCase() === ratingVal.toLowerCase();
      }

      return matchesSearch && matchesStatus && matchesRating;
    });

    this.renderArchive(filtered);
  },

  async deleteInspection(roundId, deptName) {
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa đợt kiểm tra #${roundId} của khoa ${deptName || ''}?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/inspections/${roundId}`, { method: 'DELETE' });
      if (res.ok) {
        App.showToast(`Đã xóa thành công đợt kiểm tra #${roundId}`, 'success');
        this.loadArchiveList();
        if (this.dashboardData) this.loadStats();
        return;
      }
    } catch (e) {}

    // Fallback: Delete from localStorage
    try {
      let localList = JSON.parse(localStorage.getItem('bd_nurse_inspections') || '[]');
      localList = localList.filter(r => r.id != roundId);
      localStorage.setItem('bd_nurse_inspections', JSON.stringify(localList));
      App.showToast(`Đã xóa đợt kiểm tra #${roundId}`, 'success');
      this.loadArchiveList();
      if (this.dashboardData) this.loadStats();
    } catch (e) {
      App.showToast(`Lỗi: ${e.message}`, 'error');
    }
  }
};

window.Dashboard = Dashboard;
