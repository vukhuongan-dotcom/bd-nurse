/**
 * Core Application Controller for BD-NURSE (Indigo Redesign 2026-10-03)
 * Phê duyệt bởi BSCKII. Vũ Khương An
 */

// Centralized Lucide SVG Icons (Zero Emoji, Offline)
const Icons = {
  clipboardCheck: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>`,
  barChart: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`,
  history: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`,
  sun: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  moon: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  calendar: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`,
  check: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M20 6 9 17l-5-5"/></svg>`,
  checkCircle: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
  x: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  minus: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M5 12h14"/></svg>`,
  chevronDown: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="m6 9 6 6 6-6"/></svg>`,
  chevronUp: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="m18 15-6-6-6 6"/></svg>`,
  save: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>`,
  fileText: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
  file: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
  alertTriangle: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  users: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  trash: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
  edit: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
  plus: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
  refresh: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`,
  search: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  database: (cls = 'icon') => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>`
};

const App = {
  currentTab: 'tab-inspection',
  currentYear: 2026,
  currentQuarter: 4,
  departments: [],
  criteria: [],

  init() {
    this.injectStaticIcons();
    this.setupTheme();
    this.setupTabs();
    this.setupPeriodPopover();
    this.loadInitialData();
    // Progressive disclosure on mobile (<1024px)
    if (window.innerWidth < 1024) {
      const metaDetails = document.getElementById('inspect-meta-details');
      if (metaDetails) metaDetails.open = false;
      const planDetails = document.getElementById('corrective-plan-details');
      if (planDetails) planDetails.open = false;
    }
  },

  injectStaticIcons() {
    // Top Tabs
    const setHtml = (id, html) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };

    setHtml('icon-tab-inspection', Icons.clipboardCheck());
    setHtml('icon-tab-dashboard', Icons.barChart());
    setHtml('icon-tab-archive', Icons.history());

    // Mobile Tabs
    setHtml('icon-mobile-tab-inspection', Icons.clipboardCheck());
    setHtml('icon-mobile-tab-dashboard', Icons.barChart());
    setHtml('icon-mobile-tab-archive', Icons.history());

    // Period Chip
    setHtml('icon-period-calendar', Icons.calendar());
    setHtml('icon-period-chevron', Icons.chevronDown());

    // Meta Details
    setHtml('icon-reset-form', Icons.refresh());
    setHtml('icon-meta-chevron', Icons.chevronDown());
    setHtml('icon-preset-info', Icons.clipboardCheck('icon-sm'));

    // Desktop Summary Actions
    setHtml('icon-desktop-complete', Icons.checkCircle());
    setHtml('icon-desktop-save', Icons.save());
    setHtml('icon-desktop-docx', Icons.fileText());
    setHtml('icon-desktop-pdf', Icons.file());

    // Mobile Bottom Sheet
    setHtml('icon-sheet-close', Icons.x());

    // Archive
    setHtml('icon-archive-db', Icons.database());
    setHtml('icon-archive-search', Icons.search());
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

    const iconContainer = document.getElementById('icon-theme-toggle');
    if (iconContainer) {
      iconContainer.innerHTML = theme === 'dark' ? Icons.sun() : Icons.moon();
    }

    const wordmarkEl = document.getElementById('app-logo-wordmark');
    if (wordmarkEl) {
      wordmarkEl.src = theme === 'dark'
        ? './static/brand/indigo/nurse-wordmark-dark.svg'
        : './static/brand/indigo/nurse-wordmark-light.svg';
    }
  },

  setupTabs() {
    const allTabButtons = document.querySelectorAll('.nav-tab, .mobile-tab');
    allTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        this.switchTab(targetId);
      });
    });
  },

  switchTab(tabId) {
    this.currentTab = tabId;

    // Cập nhật trạng thái tab trên desktop
    document.querySelectorAll('.desktop-nav-tabs .nav-tab').forEach(btn => {
      const isActive = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Cập nhật trạng thái tab trên mobile
    document.querySelectorAll('.mobile-bottom-tabs .mobile-tab').forEach(btn => {
      const isActive = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Chuyển đổi nội dung phân hệ
    document.querySelectorAll('.tab-pane').forEach(p => {
      p.classList.toggle('active', p.id === tabId);
    });

    // Điều khiển hiển thị thanh điểm đáy (CHỈ hiện ở tab Chấm điểm)
    const mobileBar = document.getElementById('mobile-sticky-bar');
    if (mobileBar) {
      if (tabId === 'tab-inspection') {
        mobileBar.classList.add('visible-bar');
      } else {
        mobileBar.classList.remove('visible-bar');
      }
    }

    // Tải dữ liệu phân hệ tương ứng
    if (tabId === 'tab-dashboard') {
      Dashboard.loadStats();
    } else if (tabId === 'tab-archive') {
      Dashboard.loadArchiveList();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  setupPeriodPopover() {
    const chipBtn = document.getElementById('btn-period-chip');
    const popover = document.getElementById('period-popover');
    const applyBtn = document.getElementById('btn-apply-period');
    const yearSelect = document.getElementById('global-year-select');
    const quarterSelect = document.getElementById('global-quarter-select');

    if (!chipBtn || !popover) return;

    chipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = popover.hasAttribute('hidden');
      if (isHidden) {
        popover.removeAttribute('hidden');
        chipBtn.setAttribute('aria-expanded', 'true');
      } else {
        popover.setAttribute('hidden', '');
        chipBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && e.target !== chipBtn) {
        popover.setAttribute('hidden', '');
        chipBtn.setAttribute('aria-expanded', 'false');
      }
    });

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.currentYear = parseInt(yearSelect.value);
        this.currentQuarter = quarterSelect.value === 'all' ? null : parseInt(quarterSelect.value);

        // Cập nhật nhãn chip kỳ
        const labelEl = document.getElementById('period-chip-label');
        if (labelEl) {
          labelEl.textContent = this.currentQuarter 
            ? `Quý ${['I','II','III','IV'][this.currentQuarter - 1]}/${this.currentYear}`
            : `Năm ${this.currentYear}`;
        }

        popover.setAttribute('hidden', '');
        chipBtn.setAttribute('aria-expanded', 'false');

        if (this.currentTab === 'tab-dashboard') Dashboard.loadStats();
        if (this.currentTab === 'tab-archive') Dashboard.loadArchiveList();

        this.showToast(`Đã chuyển kỳ: ${labelEl ? labelEl.textContent : ''}`, 'info');
      });
    }
  },

  async loadInitialData() {
    const isStaticHost = window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';
    if (!isStaticHost) {
      try {
        const [deptRes, critRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/criteria')
        ]);
        if (deptRes.ok && critRes.ok) {
          this.departments = await deptRes.json();
          this.criteria = await critRes.json();
          InspectionForm.init(this.departments, this.criteria);
          return;
        }
      } catch (e) {}
    }

    if (window.WINDOW_DEPARTMENTS_DATA && window.WINDOW_CRITERIA_DATA) {
      this.departments = window.WINDOW_DEPARTMENTS_DATA;
      this.criteria = window.WINDOW_CRITERIA_DATA;
      InspectionForm.init(this.departments, this.criteria);
      console.info('BD-NURSE running in Client-Side Standalone Mode');
    } else {
      this.showToast('Không thể nạp dữ liệu tiêu chuẩn', 'error');
    }
  },

  async backupDatabaseNow() {
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        this.showToast(data.message || 'Đã sao lưu cơ sở dữ liệu an toàn vào Drive', 'success');
        return;
      }
    } catch (e) {
      // Fallback: Client-side JSON backup
    }
    const localData = localStorage.getItem('bd_nurse_inspections') || '[]';
    const blob = new Blob([localData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bd_nurse_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Đã tải tệp sao lưu dữ liệu JSON về máy', 'success');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = Icons.clipboardCheck('icon-sm');
    if (type === 'success') iconSvg = Icons.checkCircle('icon-sm');
    if (type === 'error') iconSvg = Icons.alertTriangle('icon-sm');

    toast.innerHTML = `
      <span>${iconSvg}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
