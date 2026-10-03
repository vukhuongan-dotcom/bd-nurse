/**
 * Core Application Controller for BD-NURSE
 */

const App = {
  currentTab: 'tab-inspection',
  currentYear: 2026,
  currentQuarter: 4,
  departments: [],
  criteria: [],

  init() {
    this.setupTheme();
    this.setupTabs();
    this.setupFilters();
    this.loadInitialData();
  },

  setupTheme() {
    const savedTheme = localStorage.getItem('bd_nurse_theme') || 'light';
    this.applyTheme(savedTheme);

    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        this.applyTheme(next);
      });
    }
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bd_nurse_theme', theme);

    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    }

    const logoEl = document.getElementById('app-logo-wordmark');
    if (logoEl) {
      logoEl.src = theme === 'dark'
        ? '/static/brand/nurse-wordmark-dark.svg'
        : '/static/brand/nurse-wordmark-light.svg';
    }
  },

  setupTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-tab');
        this.switchTab(targetId);
      });
    });
  },

  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach(p => {
      p.classList.toggle('active', p.id === tabId);
    });

    if (tabId === 'tab-dashboard') {
      Dashboard.loadStats();
    } else if (tabId === 'tab-archive') {
      this.loadArchiveList();
    }
  },

  setupFilters() {
    const yearSelect = document.getElementById('global-year-select');
    const quarterSelect = document.getElementById('global-quarter-select');

    if (yearSelect) {
      yearSelect.value = this.currentYear;
      yearSelect.addEventListener('change', (e) => {
        this.currentYear = parseInt(e.target.value);
        if (this.currentTab === 'tab-dashboard') Dashboard.loadStats();
        if (this.currentTab === 'tab-archive') this.loadArchiveList();
      });
    }

    if (quarterSelect) {
      quarterSelect.value = this.currentQuarter;
      quarterSelect.addEventListener('change', (e) => {
        this.currentQuarter = e.target.value === 'all' ? null : parseInt(e.target.value);
        if (this.currentTab === 'tab-dashboard') Dashboard.loadStats();
        if (this.currentTab === 'tab-archive') this.loadArchiveList();
      });
    }
  },

  async loadInitialData() {
    try {
      const [deptRes, critRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/criteria')
      ]);
      this.departments = await deptRes.json();
      this.criteria = await critRes.json();

      InspectionForm.init(this.departments, this.criteria);
    } catch (e) {
      this.showToast(`Lỗi kết nối máy chủ: ${e.message}`, 'error');
    }
  },

  async loadArchiveList() {
    const listContainer = document.getElementById('archive-table-body');
    if (!listContainer) return;

    listContainer.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px;">Đang tải danh sách...</td></tr>';

    try {
      let url = `/api/inspections?year=${this.currentYear}`;
      if (this.currentQuarter) url += `&quarter=${this.currentQuarter}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.length === 0) {
        listContainer.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">Chưa có đợt kiểm tra nào trong kỳ này.</td></tr>';
        return;
      }

      let html = '';
      data.forEach((r, idx) => {
        const ratingClass = r.rating_code;
        html += `
          <tr>
            <td><strong>#${r.id}</strong></td>
            <td><strong>${r.dept_name}</strong><br><small style="color:var(--text-muted);">${r.dept_block}</small></td>
            <td>Quý ${r.quarter} / ${r.year}</td>
            <td>${r.inspection_time}</td>
            <td><strong>${r.compliance_rate}%</strong> (${r.total_achieved_score}/${r.total_standard_score - r.total_kap_score})</td>
            <td><span class="rating-badge ${ratingClass}">${r.rating}</span></td>
            <td>
              <span style="font-size:12px; font-weight:700; color:${r.trang_thai === 'da_khoa' ? 'var(--status-danger)' : 'var(--status-success)'};">
                ${r.trang_thai === 'da_khoa' ? '🔒 Đã khóa' : (r.trang_thai === 'nhap' ? '📝 Nháp' : '✅ Hoàn tất')}
              </span>
            </td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="btn-stage" onclick="InspectionForm.loadExistingInspection(${r.id})">Xem/Sửa</button>
                <a href="/api/inspections/${r.id}/export-docx" class="btn-stage" target="_blank" style="text-decoration:none;">Word</a>
                <a href="/api/inspections/${r.id}/export-pdf" class="btn-stage" target="_blank" style="text-decoration:none; color:var(--status-danger);">PDF</a>
              </div>
            </td>
          </tr>
        `;
      });
      listContainer.innerHTML = html;
    } catch (e) {
      listContainer.innerHTML = `<tr><td colspan="8" style="color:var(--status-danger);">Lỗi tải danh sách: ${e.message}</td></tr>`;
    }
  },

  async triggerBackup() {
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      this.showToast('Đã tạo bản sao lưu snapshot SQLite vào Google Drive thành công!', 'success');
    } catch (e) {
      this.showToast(`Lỗi sao lưu: ${e.message}`, 'error');
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️')}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // DLP Scanner: Quét cảnh báo nếu phát hiện số điện thoại hoặc mã hồ sơ bệnh án
  scanDLP(text) {
    if (!text) return null;
    const phonePattern = /(?:0[3|5|7|8|9])[0-9]{8}\b/;
    const cccdPattern = /\b[0-9]{12}\b/;
    const mrnPattern = /\b(?:BN|BA|MRN)[0-9]{5,}\b/i;

    if (phonePattern.test(text)) return "Phát hiện chuỗi giống Số Điện Thoại. Vui lòng không ghi thông tin định danh!";
    if (cccdPattern.test(text)) return "Phát hiện chuỗi giống Số CCCD/Định danh cá nhân!";
    if (mrnPattern.test(text)) return "Phát hiện chuỗi giống Mã Số Bệnh Án!";
    return null;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
