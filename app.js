// 2028 學測家長陪跑日曆 - 人文誌極致版 (當下焦點 ＆ 歷史收合)
let feedData = null;
let deptDrawData = null;
let deptLinks = null;

// 正在檢視的週四項目（預設為當下最新一期）
let activeThursItem = null;
let deferredPrompt = null;

// 錨定學測預估日：2028 年 1 月 14 日
const EXAM_DATE = new Date('2028-01-14T09:00:00+08:00');

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  registerServiceWorker();
  setupPwaBanner();

  await loadAllData();

  updateCountdownDisplay();
  renderCurrentContent();
  renderDeptBrowser();

  // 定時微調週數
  setInterval(updateCountdownDisplay, 60000);
});

// 載入資料包（物理防洩密：前台僅讀取脫敏 public_feed.json）
async function loadAllData() {
  try {
    const [feedRes, dddRes, dlRes] = await Promise.all([
      fetch('./data/public_feed.json?v=' + Date.now()).then(r => r.json()),
      fetch('./data/dept_draw_data.json').then(r => r.json()),
      fetch('./data/dept_links.json').then(r => r.json())
    ]);
    feedData = feedRes;
    deptDrawData = dddRes;
    deptLinks = dlRes;

    if (feedData) {
      activeThursItem = feedData.current_thursday;
    }
  } catch (err) {
    console.error('資料載入異常：', err);
  }
}

// 倒數週數計算（純週數展示，去除天時分秒機械感）
function updateCountdownDisplay() {
  const now = new Date();
  const diffTime = EXAM_DATE - now;

  const weeksNumEl = document.getElementById('weeks-num');
  if (!weeksNumEl) return;

  if (diffTime <= 0) {
    weeksNumEl.textContent = '0';
    return;
  }

  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const remainWeeks = Math.max(0, Math.ceil(days / 7));
  weeksNumEl.textContent = remainWeeks;
}

// 渲染當下內容（只看當下，不顯示未來未解鎖的一整排列表）
function renderCurrentContent() {
  if (!feedData) return;

  renderWeeklyPushCard(activeThursItem);
  renderHistoryThursdays();
  renderWeekendFocus();
}

// 1. 渲染「本週指引」（當下焦點）
function renderWeeklyPushCard(item) {
  const container = document.getElementById('weekly-push-container');
  if (!container) return;

  if (!item) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px 20px; color: var(--text-muted);">
        暫無最新指引
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="card-top-meta">
      <span class="stage-tag">${item.stage}</span>
      <span style="font-size: 0.82rem; color: var(--text-muted);">${item.release_date} 發布</span>
    </div>

    <h3 class="card-main-title">「${item.sample_push}」</h3>

    <div class="question-highlight-box">
      <div class="question-label">家長關鍵問答・精選解惑</div>
      <div class="question-text">${item.question}</div>
    </div>

    <div class="action-card-grid">
      <div class="action-row">
        <div class="action-header">
          <span>🌱</span> 學生本週節奏
        </div>
        <div class="action-desc">${item.student_task}</div>
      </div>

      <div class="action-row">
        <div class="action-header">
          <span>☕</span> 家長陪伴心法
        </div>
        <div class="action-desc">${item.parent_task}</div>
      </div>
    </div>
  `;

  const titleEl = document.getElementById('current-week-title');
  if (titleEl) {
    titleEl.textContent = `第 ${item.index} 週 ｜ 倒數 ${item.countdown_weeks} 週`;
  }
}

// 渲染「歷史週次回看」（預設折疊收起）
function renderHistoryThursdays() {
  const historyList = feedData ? feedData.history_thursdays : [];
  const container = document.getElementById('thurs-history-container');
  const wrapper = document.getElementById('thurs-history-wrapper');

  if (!container || !wrapper) return;

  if (!historyList || historyList.length === 0) {
    wrapper.style.display = 'none';
    return;
  }

  wrapper.style.display = 'block';
  document.getElementById('thurs-history-count').textContent = historyList.length;

  container.innerHTML = historyList.slice().reverse().map(it => {
    return `
      <div class="history-item-row" onclick="viewHistoryThurs(${it.index})" style="padding: 10px 12px; border-bottom: 1px solid #f1f0eb; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-headline);">第 ${it.index} 週 (${it.release_date})</span>
          <div style="font-size: 0.85rem; color: #475569; margin-top: 2px;">${it.question}</div>
        </div>
        <span style="font-size: 0.8rem; color: var(--accent-warm); font-weight: 600;">回看 ➔</span>
      </div>
    `;
  }).join('');
}

// 點擊回看過往某一週
window.viewHistoryThurs = function(weekIndex) {
  if (!feedData) return;
  const all = [feedData.current_thursday, ...(feedData.history_thursdays || [])].filter(Boolean);
  const target = all.find(it => it.index === weekIndex);
  if (target) {
    activeThursItem = target;
    renderWeeklyPushCard(activeThursItem);
    // 捲動回卡片頂部
    document.getElementById('weekly-push-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

// 切換回到當下最新一週
window.resetToCurrentThurs = function() {
  if (feedData && feedData.current_thursday) {
    activeThursItem = feedData.current_thursday;
    renderWeeklyPushCard(activeThursItem);
  }
};

// 折疊/展開歷史週次
window.toggleThursHistory = function() {
  const c = document.getElementById('thurs-history-drawer');
  const btn = document.getElementById('toggle-thurs-history-btn');
  if (c.style.display === 'none' || c.style.display === '') {
    c.style.display = 'block';
    btn.textContent = '收合過往指引 ▲';
  } else {
    c.style.display = 'none';
    btn.textContent = '展開過往指引 ▼';
  }
};

// 2. 渲染「週末看系」（只顯示當下最新發布，歷史預設折疊，未來絕不顯示）
function renderWeekendFocus() {
  const currentDept = feedData ? feedData.current_weekend : null;
  const historyDepts = feedData ? feedData.history_weekends : [];

  const focusContainer = document.getElementById('weekend-focus-card');
  const historyWrapper = document.getElementById('weekend-history-wrapper');
  const historyListContainer = document.getElementById('weekend-history-list');

  // A. 當下最新焦點科系
  if (!currentDept) {
    focusContainer.innerHTML = `
      <div style="text-align: center; padding: 30px 20px; color: var(--text-muted);">
        <p style="font-size: 1rem;">🌱 首期週末科系即將發布，敬請期待！</p>
      </div>
    `;
  } else {
    focusContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="release-badge" style="background:#eef7f2; color:#1b633e;">${currentDept.day} ｜ ${currentDept.release_date}</span>
        <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-warm);">${currentDept.tag}</span>
      </div>
      <h3 style="font-size: 1.4rem; font-weight: 900; color: var(--text-headline); margin: 6px 0 8px;">
        ${currentDept.group_name}
      </h3>
      <p style="font-size: 0.95rem; color: #475569; margin-bottom: 16px; line-height: 1.6;">
        ${currentDept.desc}
      </p>
      <button class="btn btn-sm" onclick="viewGroupDetail('${currentDept.group_name}')" style="background: var(--text-headline);">
        查看全台開設校系與官方網站 ➔
      </button>
    `;
  }

  // B. 歷史科系（折疊收起）
  if (!historyDepts || historyDepts.length === 0) {
    historyWrapper.style.display = 'none';
  } else {
    historyWrapper.style.display = 'block';
    document.getElementById('weekend-history-count').textContent = historyDepts.length;

    historyListContainer.innerHTML = historyDepts.slice().reverse().map(dept => {
      return `
        <div style="padding: 12px 14px; border-bottom: 1px solid #f1f0eb; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${dept.release_date} (${dept.day})</span>
            <div style="font-size: 0.96rem; font-weight: 800; color: var(--text-headline); margin-top: 2px;">${dept.group_name}</div>
            <div style="font-size: 0.82rem; color: #64748b;">${dept.schools_count} 所大學開設</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="viewGroupDetail('${dept.group_name}')">
            查校系 ➔
          </button>
        </div>
      `;
    }).join('');
  }
}

// 折疊/展開歷史科系
window.toggleWeekendHistory = function() {
  const c = document.getElementById('weekend-history-drawer');
  const btn = document.getElementById('toggle-weekend-history-btn');
  if (c.style.display === 'none' || c.style.display === '') {
    c.style.display = 'block';
    btn.textContent = '收合過往科系 ▲';
  } else {
    c.style.display = 'none';
    btn.textContent = '展開過往科系 ▼';
  }
};

// 點擊查看特定科系全台名單
window.viewGroupDetail = function(groupName) {
  switchTab('depts-pane');
  const searchInput = document.getElementById('dept-search-input');
  searchInput.value = groupName.replace('特色唯一專輯：全台稀有學系', '');
  filterDepts();
};

// 600 群科系全量資料庫檢索
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
        <p style="font-size: 1rem;">查無符合的科系或學校</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 12px; display: flex; justify-content: space-between;">
      <span>找到 ${filtered.length} 個科系群（展示前 ${displayGroups.length} 群）</span>
      <span>115 學年度底本</span>
    </div>
    ${displayGroups.map(group => {
      const groupItems = group.items.map(it => {
        const linkKey = `${it.school}|${it.dept}`;
        const linkInfo = deptLinks && deptLinks.links ? deptLinks.links[linkKey] : null;

        let linkBadge = `<span style="font-size: 0.78rem; color:#94a3b8;">未登錄</span>`;
        if (linkInfo) {
          if (linkInfo.type === 'dept') {
            linkBadge = `<a href="${linkInfo.url}" target="_blank" rel="noopener" class="link-badge link-dept-green">
              🏛️ 官方首頁 ↗
            </a>`;
          } else if (linkInfo.type === 'rule') {
            linkBadge = `<a href="${linkInfo.url}" target="_blank" rel="noopener" class="link-badge link-rule-amber">
              📋 [分則頁] ↗
            </a>`;
          }
        }

        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #f1f0eb;">
            <div>
              <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-headline);">${it.school}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">${it.dept}</div>
              <span style="font-size: 0.76rem; background: #faf9f6; border: 1px solid #f0eee8; padding: 2px 6px; border-radius: 4px; color: #64748b; margin-top: 3px; display: inline-block;">
                參採：${it.subjects || '無學測參採'}
              </span>
            </div>
            <div>
              ${linkBadge}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="editorial-card" style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
            <h3 style="color: var(--text-headline); font-size: 1.08rem; font-weight: 800;">${group.name}</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${group.schools} 校・${group.programs} 系組</span>
          </div>
          <div style="max-height: 260px; overflow-y: auto; padding-right: 4px;">
            ${groupItems}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

// 快速考科過濾
window.toggleSubjectFilter = function(btn, subject) {
  const allBtns = document.querySelectorAll('.filter-chip-row .filter-chip');
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

// 導航分頁切換
function setupTabs() {
  const tabs = document.querySelectorAll('.pill-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      switchTab(targetId);
    });
  });
}

window.switchTab = function(targetTabId) {
  document.querySelectorAll('.pill-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === targetTabId);
  });
  document.querySelectorAll('.tab-pane').forEach(c => {
    c.classList.toggle('active', c.id === targetTabId);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// PWA 註冊與推播通知測試
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js?v=20280114-clean').catch(e => console.log('SW error:', e));
  }
}

function setupPwaBanner() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'block';
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

window.triggerPushTest = async function() {
  if (!('Notification' in window)) {
    alert('⚠️ 您的瀏覽器不支援通知功能。');
    return;
  }
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission === 'granted') {
    const item = activeThursItem;
    const title = '🔔 2028 學測家長陪跑日曆';
    const body = item && item.question ? `【${item.stage}】${item.question}` : '本週最新指引已發布！';
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, { body, icon: './manifest.json' });
        return;
      } catch (e) {}
    }
    new Notification(title, { body, icon: './manifest.json' });
  } else {
    alert('通知權限未開啟，請至瀏覽器設定允許通知。');
  }
};
