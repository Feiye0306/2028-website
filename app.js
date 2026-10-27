// 2028 學測家長陪跑日曆 - 核心邏輯（排程公開版）
let masterSchedule = null;
let deptDrawData = null;
let deptLinks = null;

// 當前基準日期（預設真實日期，負責人可在控制台手動覆蓋以模擬特定日期）
let simulatedDate = new Date(); // 當前真實時間
let overrideAllUnlocked = false; // 是否強制全部解鎖預覽

let currentThursIndex = 0;
let deferredPrompt = null;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  registerServiceWorker();
  setupPwaBanner();

  await loadAllData();

  initCountdown();
  applyScheduleFilter();
  renderDeptBrowser();

  // 每秒更新倒數
  setInterval(updateCountdownDisplay, 1000);
});

// 載入資料包
async function loadAllData() {
  try {
    const [schedRes, dddRes, dlRes] = await Promise.all([
      fetch('./data/master_schedule.json').then(r => r.json()),
      fetch('./data/dept_draw_data.json').then(r => r.json()),
      fetch('./data/dept_links.json').then(r => r.json())
    ]);
    masterSchedule = schedRes;
    deptDrawData = dddRes;
    deptLinks = dlRes;
  } catch (err) {
    console.error('資料載入失敗：', err);
  }
}

// 倒數計時計算（依負責人指示：以 2028/01/14 為準，僅倒數週數）
const EXAM_DATE = new Date('2028-01-14T09:00:00+08:00');

function updateCountdownDisplay() {
  const now = simulatedDate || new Date();
  const diff = EXAM_DATE - now;

  const weeksNumEl = document.getElementById('weeks-num');
  const weeksSubEl = document.getElementById('weeks-sub-note');

  if (diff <= 0) {
    if (weeksNumEl) weeksNumEl.textContent = '0';
    if (weeksSubEl) weeksSubEl.textContent = '已迎戰 2028 學測！';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const remainWeeks = Math.max(0, Math.ceil(days / 7));

  if (weeksNumEl) weeksNumEl.textContent = remainWeeks;
  if (weeksSubEl) weeksSubEl.textContent = `距離 2028/01/14 預估學測日尚餘約 ${days} 天`;
}

function initCountdown() {
  updateCountdownDisplay();
}

// 依據排程日期過濾與渲染
function applyScheduleFilter() {
  if (!masterSchedule) return;

  const todayStr = simulatedDate.toISOString().slice(0, 10);
  const viewDateEl = document.getElementById('current-view-date');
  if (viewDateEl) viewDateEl.textContent = todayStr;

  // 1. 計算週四問題公開狀態
  const thursdays = masterSchedule.thursday_releases;
  let latestUnlockedThursIdx = 0;

  thursdays.forEach((item, idx) => {
    item.is_unlocked = overrideAllUnlocked || (item.release_date <= todayStr);
    if (item.is_unlocked) {
      latestUnlockedThursIdx = idx;
    }
  });

  currentThursIndex = latestUnlockedThursIdx;
  renderWeeklyPush();

  // 2. 渲染週末科系發布（未到期遮蔽）
  renderWeekendReleases(todayStr);

  // 3. 渲染負責人排程後台
  renderAdminScheduleTables();
}

// 每週四推播渲染
function renderWeeklyPush() {
  if (!masterSchedule || !masterSchedule.thursday_releases) return;

  const item = masterSchedule.thursday_releases[currentThursIndex];
  if (!item) return;

  const container = document.getElementById('weekly-push-container');
  const todayStr = simulatedDate.toISOString().slice(0, 10);

  if (!item.is_unlocked && !overrideAllUnlocked) {
    container.innerHTML = `
      <div style="text-align: center; padding: 35px 20px; background: #fef2f2; border: 1px dashed #f87171; border-radius: 12px;">
        <span style="font-size: 2.2rem;">🔒</span>
        <h3 style="color: #991b1b; margin: 10px 0 6px;">尚未到達公開時間</h3>
        <p style="font-size: 0.92rem; color: #7f1d1d;">
          本期題目與指引預定於 <strong>${item.release_date}（${item.day}）</strong> 正式公開解鎖。
        </p>
        <p style="font-size: 0.84rem; color: #94a3b8; margin-top: 8px;">
          * 家長陪跑採逐步解鎖制，每週四準時釋出對應時程行動指南。
        </p>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="push-header">
        <span class="push-tag">📌 ${item.stage}</span>
        <span style="font-size: 0.82rem; color: var(--text-muted);">${item.release_date} 公開（約剩 ${item.countdown_weeks} 週）</span>
      </div>
      <h3 class="push-title">「${item.sample_push}」</h3>
      
      <div class="qa-card" style="margin-top: 0; margin-bottom: 12px;">
        <h4>💡 本週公開・家長關鍵解惑</h4>
        <p style="font-size: 1rem; color: #92400e;">${item.question}</p>
      </div>

      <div class="action-block">
        <h4>🎯 本階段・學生適合做什麼</h4>
        <p>${item.student_task}</p>
      </div>

      <div class="action-block">
        <h4>☕ 本階段・家長適合做什麼</h4>
        <p>${item.parent_task}</p>
      </div>
    `;
  }

  document.getElementById('stage-pager-text').textContent = 
    `第 ${item.index} 週 / 共 ${masterSchedule.thursday_releases.length} 週`;
}

// 週次切換
window.changeThursIndex = function(offset) {
  if (!masterSchedule || !masterSchedule.thursday_releases) return;
  const newIndex = currentThursIndex + offset;
  if (newIndex >= 0 && newIndex < masterSchedule.thursday_releases.length) {
    currentThursIndex = newIndex;
    renderWeeklyPush();
  }
};

// 週末科系發布渲染（排程解鎖）
function renderWeekendReleases(todayStr) {
  if (!masterSchedule || !masterSchedule.weekend_releases) return;

  const container = document.getElementById('weekend-releases-list');
  const items = masterSchedule.weekend_releases;

  // 統計已公開數量
  const unlockedCount = items.filter(it => overrideAllUnlocked || it.release_date <= todayStr).length;

  const headerHtml = `
    <div style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 12px; display: flex; justify-content: space-between;">
      <span>目前已公開：<strong>${unlockedCount}</strong> / ${items.length} 週末格</span>
      <span>每週六、日依序解鎖</span>
    </div>
  `;

  const listHtml = items.map(item => {
    const isUnlocked = overrideAllUnlocked || (item.release_date <= todayStr);

    if (!isUnlocked) {
      return `
        <div class="release-list-item" style="opacity: 0.65; background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="weekend-badge" style="background: #e2e8f0; color: #64748b; border: none;">
              🔒 ${item.day}・${item.release_date}
            </span>
            <span style="font-size: 0.8rem; color: #94a3b8;">排程鎖定中</span>
          </div>
          <h4 style="color: #64748b; margin-top: 6px; font-size: 0.98rem;">第 ${item.slot_num} 格：即將於 ${item.release_date} 公開</h4>
        </div>
      `;
    }

    return `
      <div class="release-list-item" style="background: #ffffff; padding: 14px; border: 1px solid var(--border); border-radius: 10px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span class="weekend-badge">${item.day}・${item.release_date}</span>
          <span style="font-size: 0.8rem; font-weight: 600; color: #475569;">${item.tag}</span>
        </div>
        <h3 style="font-size: 1.15rem; color: var(--primary); margin-bottom: 6px;">${item.group_name}</h3>
        <p style="font-size: 0.92rem; color: #334155; margin-bottom: 8px;">${item.desc}</p>
        <button class="btn btn-secondary btn-sm" onclick="viewGroupDetail('${item.group_name}')">
          查看全台 ${item.schools_count} 所開設校系與官方首頁 ➔
        </button>
      </div>
    `;
  }).join('');

  container.innerHTML = headerHtml + listHtml;
}

// 點擊查看特定科系群詳情
window.viewGroupDetail = function(groupName) {
  switchTab('depts-tab');
  const searchInput = document.getElementById('dept-search-input');
  searchInput.value = groupName.replace('特色唯一專輯：全台稀有學系', '');
  filterDepts();
};

// 600 群科系全量資料庫渲染與搜尋
function renderDeptBrowser() {
  if (!deptDrawData || !deptDrawData.groups) return;
  filterDepts();
}

window.filterDepts = function() {
  if (!deptDrawData || !deptDrawData.groups) return;

  const keyword = (document.getElementById('dept-search-input').value || '').trim().toLowerCase();
  const activeSubject = window.selectedSubject || '';

  const container = document.getElementById('dept-browser-list');

  const filtered = deptDrawData.groups.filter(group => {
    const matchGroup = group.name.toLowerCase().includes(keyword);
    const matchItems = group.items.some(it => 
      it.school.toLowerCase().includes(keyword) || 
      it.dept.toLowerCase().includes(keyword)
    );
    const matchKeyword = !keyword || matchGroup || matchItems;

    let matchSub = true;
    if (activeSubject) {
      matchSub = group.items.some(it => it.subjects && it.subjects.includes(activeSubject));
    }

    return matchKeyword && matchSub;
  });

  const displayLimit = 25;
  const displayGroups = filtered.slice(0, displayLimit);

  if (displayGroups.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
        <p style="font-size: 1.1rem;">查無符合的科系或學校</p>
        <p style="font-size: 0.85rem; margin-top: 6px;">可嘗試清除篩選條件，或以「資訊」、「電機」、「財金」等簡稱搜尋</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 12px; display: flex; justify-content: space-between;">
      <span>找到 ${filtered.length} 個科系群（共展示前 ${displayGroups.length} 群）</span>
      <span>資料底本：115 學年度個人申請</span>
    </div>
    ${displayGroups.map(group => {
      const groupItems = group.items.map(it => {
        const linkKey = `${it.school}|${it.dept}`;
        const linkInfo = deptLinks && deptLinks.links ? deptLinks.links[linkKey] : null;

        let linkBadge = `<span class="subjects-pill">未登錄網址</span>`;
        if (linkInfo) {
          if (linkInfo.type === 'dept') {
            linkBadge = `<a href="${linkInfo.url}" target="_blank" rel="noopener" class="link-btn link-dept">
              🏛️ 官方首頁 ↗
            </a>`;
          } else if (linkInfo.type === 'rule') {
            linkBadge = `<a href="${linkInfo.url}" target="_blank" rel="noopener" class="link-btn link-rule">
              📋 [分則頁] ↗
            </a>`;
          }
        }

        return `
          <div class="dept-item-row">
            <div>
              <div class="school-name">${it.school}</div>
              <div class="dept-name">${it.dept}</div>
              <span class="subjects-pill">參採：${it.subjects || '無學測參採'}</span>
            </div>
            <div>
              ${linkBadge}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="card" style="margin-bottom: 14px; border-left: 4px solid var(--primary);">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
            <h3 style="color: var(--primary); font-size: 1.1rem;">${group.name}</h3>
            <span style="font-size: 0.82rem; color: var(--text-muted);">${group.schools} 校・${group.programs} 系組</span>
          </div>
          <div style="max-height: 280px; overflow-y: auto; padding-right: 4px;">
            ${groupItems}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

// 快速考科過濾
window.toggleSubjectFilter = function(btn, subject) {
  const allBtns = document.querySelectorAll('.filter-tags .tag-btn');
  if (window.selectedSubject === subject) {
    window.selectedSubject = '';
    btn.classList.remove('active');
  } else {
    allBtns.forEach(b => b.classList.remove('active'));
    window.selectedSubject = subject;
    btn.classList.add('active');
  }
  filterDepts();
};

// 導航 Tab 切換
function setupTabs() {
  const tabs = document.querySelectorAll('.nav-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      switchTab(targetId);
    });
  });
}

window.switchTab = function(targetTabId) {
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === targetTabId);
  });
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id === targetTabId);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ==================== 負責人專屬排程控制台功能 ====================

window.toggleAdminPanel = function() {
  const panel = document.getElementById('admin-schedule-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
};

window.applySimulatedDate = function() {
  const inputVal = document.getElementById('admin-date-picker').value;
  if (inputVal) {
    simulatedDate = new Date(inputVal + 'T12:00:00+08:00');
    overrideAllUnlocked = false;
    applyScheduleFilter();
    updateCountdownDisplay();
    alert(`已切換模擬日期至：${inputVal}`);
  }
};

window.resetToRealDate = function() {
  simulatedDate = new Date();
  overrideAllUnlocked = false;
  document.getElementById('admin-date-picker').value = '';
  applyScheduleFilter();
  updateCountdownDisplay();
  alert('已重設為真實當前時間！');
};

window.toggleUnlockAll = function() {
  overrideAllUnlocked = !overrideAllUnlocked;
  applyScheduleFilter();
  alert(overrideAllUnlocked ? '已切換為：全部強制解鎖預覽' : '已恢復為：依日期逐步解鎖');
};

function renderAdminScheduleTables() {
  if (!masterSchedule) return;

  // 1. 問題公開排程表
  const qContainer = document.getElementById('admin-q-table-body');
  if (qContainer) {
    qContainer.innerHTML = masterSchedule.thursday_releases.map((it, idx) => {
      return `
        <tr>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${it.index}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;"><strong>${it.release_date}</strong></td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${it.stage}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; max-width: 280px; font-size: 0.85rem;">${it.question}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${it.is_unlocked ? '✅ 已解鎖' : '🔒 排程中'}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">
            <button class="btn btn-sm btn-secondary" onclick="editThursItem(${idx})">調整</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 2. 科系公開排程表
  const dContainer = document.getElementById('admin-d-table-body');
  if (dContainer) {
    dContainer.innerHTML = masterSchedule.weekend_releases.map((it, idx) => {
      const todayStr = simulatedDate.toISOString().slice(0, 10);
      const isUn = overrideAllUnlocked || (it.release_date <= todayStr);
      return `
        <tr>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${it.slot_num}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${it.release_date} (${it.day})</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;"><strong>${it.group_name}</strong></td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${it.schools_count} 校</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${isUn ? '✅ 已解鎖' : '🔒 排程中'}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">
            <button class="btn btn-sm btn-secondary" onclick="editWeekendItem(${idx})">調整</button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// 調整單筆週四項目
window.editThursItem = function(idx) {
  const item = masterSchedule.thursday_releases[idx];
  const newDate = prompt(`調整第 ${item.index} 週公開日期 (目前: ${item.release_date})：`, item.release_date);
  if (newDate) {
    item.release_date = newDate;
    const newQ = prompt(`調整公開題目：`, item.question);
    if (newQ) item.question = newQ;
    applyScheduleFilter();
  }
};

// 調整單筆週末項目
window.editWeekendItem = function(idx) {
  const item = masterSchedule.weekend_releases[idx];
  const newDate = prompt(`調整第 ${item.slot_num} 格公開日期 (目前: ${item.release_date})：`, item.release_date);
  if (newDate) item.release_date = newDate;
  const newDept = prompt(`調整發布科系群組名稱 (目前: ${item.group_name})：`, item.group_name);
  if (newDept) item.group_name = newDept;
  applyScheduleFilter();
};

// 匯出當前調整後的排程
window.exportScheduleJson = function() {
  const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(masterSchedule, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", str);
  dlAnchor.setAttribute("download", "master_schedule_custom.json");
  dlAnchor.click();
};

// PWA 與通知
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW error:', err);
    });
  }
}

function setupPwaBanner() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'flex';
  });
}

window.installPwa = function() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      document.getElementById('pwa-install-banner').style.display = 'none';
    });
  } else {
    alert('手機瀏覽可點選瀏覽器選單「加入主畫面」安裝。');
  }
};

window.triggerPushTest = function() {
  if (!('Notification' in window)) {
    alert('瀏覽器不支援通知');
    return;
  }
  Notification.requestPermission().then(p => {
    if (p === 'granted') {
      const it = masterSchedule.thursday_releases[currentThursIndex];
      new Notification('🔔 2028 學測家長推播', {
        body: it ? `【${it.stage}】${it.question}` : '本週最新時程指南已發布！',
        icon: './manifest.json'
      });
    }
  });
};
