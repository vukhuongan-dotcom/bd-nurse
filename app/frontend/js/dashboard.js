/**
 * Dashboard & Analytics Controller for BD-NURSE (Chart.js 4.4)
 */

const Dashboard = {
  rankingChart: null,
  ratingChart: null,
  defectsChart: null,

  async loadStats() {
    try {
      let url = `/api/stats/dashboard?year=${App.currentYear}`;
      if (App.currentQuarter) url += `&quarter=${App.currentQuarter}`;

      const res = await fetch(url);
      const data = await res.json();

      this.renderKPIs(data);
      this.renderCharts(data);
      this.renderOverdueTable(data.overdue_actions || []);
    } catch (e) {
      App.showToast(`Lỗi tải dữ liệu Dashboard: ${e.message}`, 'error');
    }
  },

  renderKPIs(data) {
    const kpiProgress = document.getElementById('kpi-progress');
    const kpiAvgRate = document.getElementById('kpi-avg-rate');
    const kpiRatingDist = document.getElementById('kpi-rating-dist');

    if (kpiProgress) {
      kpiProgress.innerHTML = `
        ${data.inspected_departments} / ${data.total_departments} Khoa
        <small style="font-size:14px; font-weight:600; color:var(--brand-primary);">(${data.progress_rate}%)</small>
      `;
    }

    if (kpiAvgRate) {
      kpiAvgRate.textContent = `${data.average_compliance_rate}%`;
    }

    if (kpiRatingDist) {
      const dist = data.rating_distribution || {};
      kpiRatingDist.innerHTML = `
        <span style="color:var(--status-success);">${dist.dat || 0} Đạt</span> •
        <span style="color:var(--status-info);">${dist.tot || 0} Tốt</span> •
        <span style="color:var(--status-warning);">${dist.can_cai_tien || 0} Cải tiến</span> •
        <span style="color:var(--status-danger);">${dist.khong_dat || 0} K.Đạt</span>
      `;
    }
  },

  renderCharts(data) {
    this.renderRankingChart(data.ranking || []);
    this.renderRatingChart(data.rating_distribution || {});
    this.renderDefectsChart(data.top_defects || []);
  },

  renderRankingChart(ranking) {
    const ctx = document.getElementById('chart-ranking');
    if (!ctx) return;

    if (this.rankingChart) this.rankingChart.destroy();

    const labels = ranking.map(r => r.dept_name);
    const scores = ranking.map(r => r.compliance_rate);
    const colors = ranking.map(r => {
      if (r.rating_code === 'dat') return '#16a34a';
      if (r.rating_code === 'tot') return '#2563eb';
      if (r.rating_code === 'can_cai_tien') return '#d97706';
      return '#dc2626';
    });

    this.rankingChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Tỷ lệ tuân thủ (%)',
          data: scores,
          backgroundColor: colors,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` Tuân thủ: ${context.parsed.x}%`
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(150, 150, 150, 0.15)' }
          },
          y: {
            grid: { display: false }
          }
        }
      }
    });
  },

  renderRatingChart(dist) {
    const ctx = document.getElementById('chart-rating-dist');
    if (!ctx) return;

    if (this.ratingChart) this.ratingChart.destroy();

    this.ratingChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Đạt (≥90%)', 'Tốt (80-89%)', 'Cần cải tiến (70-79%)', 'KHÔNG ĐẠT (<70%)'],
        datasets: [{
          data: [dist.dat || 0, dist.tot || 0, dist.can_cai_tien || 0, dist.khong_dat || 0],
          backgroundColor: ['#16a34a', '#2563eb', '#d97706', '#dc2626']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  },

  renderDefectsChart(topDefects) {
    const ctx = document.getElementById('chart-top-defects');
    if (!ctx) return;

    if (this.defectsChart) this.defectsChart.destroy();

    const labels = topDefects.map(d => `Mục ${d.muc_stt}.${d.thu_tu}: ${d.muc_ten.substring(0, 25)}...`);
    const rates = topDefects.map(d => d.failed_rate || 0);

    this.defectsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Tỷ lệ vi phạm (%)',
          data: rates,
          backgroundColor: '#ef4444',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(150, 150, 150, 0.15)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  },

  renderOverdueTable(actions) {
    const tableBody = document.getElementById('overdue-table-body');
    if (!tableBody) return;

    if (actions.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--text-muted);">Không có khoa nào quá hạn hoặc cần hành động khẩn.</td></tr>';
      return;
    }

    let html = '';
    actions.forEach(a => {
      const isDanger = a.rating_code === 'khong_dat';
      const deadline = isDanger ? a.han_tai_giam_sat : a.han_khac_phuc;
      const typeText = isDanger ? 'Tái giám sát (+3-5 ngày)' : 'Khắc phục (+48h)';

      html += `
        <tr>
          <td><strong>${a.dept_name}</strong></td>
          <td><span class="rating-badge ${a.rating_code}">${a.rating}</span></td>
          <td>${a.inspection_time}</td>
          <td><strong>${deadline || 'Chưa cập nhật'}</strong></td>
          <td><span style="font-weight:700; color:${isDanger ? 'var(--status-danger)' : 'var(--status-warning)'};">${typeText}</span></td>
        </tr>
      `;
    });
    tableBody.innerHTML = html;
  }
};
