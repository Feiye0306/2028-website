// 2028 學測家長陪跑日曆 - 人文誌極致版
// 雙焦點：本週指引 ＆ 週末主打 ＋ 全台 2,178 校系檢索 ＋ 說明會開放開關

let feedData = null;
let deptDrawData = null;
let deptLinks = null;
let allProgramsList = []; // 全台 2,178 系組扁平化清單

let activeThursItem = null;
let deferredPrompt = null;
let isGateOpen = false;
let hasInitiallyRendered = false;

// 錨定學測預估日：2028 年 1 月 14 日（負責人確認之官方預估日）
const EXAM_DATE = new Date('2028-01-14T09:00:00+08:00');

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  registerServiceWorker();
  setupPwaBanner();

  updateCountdownDisplay();
  setInterval(updateCountdownDisplay, 60000);

  // 1. 初次載入 gate 狀態
  await checkGateStatus();

  // 2. 啟動每 30 秒自動輪詢開放開關（cache-buster 防快取）
  setInterval(checkGateStatus, 30000);
});

// 檢查開放開關 (docs/data/gate.json)
async function checkGateStatus() {
  try {
    const res = await fetch('./data/gate.json?t=' + Date.now());
    if (!res.ok) throw new Error('Gate fetch failed');
    const gate = await res.json();
    const newOpenState = !!gate.open;

    if (newOpenState !== isGateOpen || !hasInitiallyRendered) {
      isGateOpen = newOpenState;
      handleGateStateTransition(isGateOpen);
    }
  } catch (e) {
    console.warn('檢查開放開關警告：', e);
    // 預設若為本機離線或未設定，若已有快取保持現況
  }
}

// 處理開關狀態切換（無感平滑展開）
async function handleGateStateTransition(open) {
  const lockedCard = document.getElementById('gate-locked-card');
  const unlockedArea = document.getElementById('unlocked-content-area');

  if (!open) {
    if (lockedCard) lockedCard.style.display = 'block';
    if (unlockedArea) unlockedArea.style.display = 'none';
  } else {
    if (lockedCard) lockedCard.style.display = 'none';
    if (unlockedArea) {
      unlockedArea.style.display = 'block';
      unlockedArea.style.animation = 'fadeIn 0.5s ease-in-out';
    }

    // 首次開放或切換時，載入大資料
    if (!feedData || !deptDrawData) {
      await loadAllData();
      renderCurrentContent();
      buildAllProgramsList();
      renderInitialSearchResults();
    }
  }
  hasInitiallyRendered = true;
}

// 載入資料包（前台僅讀取脫敏 public_feed.json 與科系資料庫）
async function loadAllData() {
  try {
    const [feedRes, dddRes, dlRes] = await Promise.all([
      fetch('./data/public_feed.json?v=' + Date.now()).then(r => r.json()),
      fetch('./data/dept_draw_data.json?v=' + Date.now()).then(r => r.json()),
      fetch('./data/dept_links.json?v=' + Date.now()).then(r => r.json())
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

// 扁平化整理全台 2,178 系組以供快速全文檢索
function buildAllProgramsList() {
  if (!deptDrawData || !deptDrawData.groups) return;
  const map = new Map();

  deptDrawData.groups.forEach(g => {
    (g.items || []).forEach(it => {
      const key = `${it.school}|${it.dept}`;
      if (!map.has(key)) {
        map.set(key, {
          school: it.school,
          dept: it.dept,
          subjects: it.subjects || '無學測參採',
          groupName: g.name
        });
      }
    });
  });

  allProgramsList = Array.from(map.values());
  const statsEl = document.getElementById('search-stats');
  if (statsEl) {
    statsEl.firstElementChild.textContent = `全台共收錄 ${allProgramsList.length.toLocaleString()} 個大學系組`;
  }
}

// 倒數週數計算（純週數展示）
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

// 渲染當下內容（只看當下發布，歷史折疊，未來絕不出現）
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

// 渲染「歷史週次回看」
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

window.viewHistoryThurs = function(weekIndex) {
  if (!feedData) return;
  const all = [feedData.current_thursday, ...(feedData.history_thursdays || [])].filter(Boolean);
  const target = all.find(it => it.index === weekIndex);
  if (target) {
    activeThursItem = target;
    renderWeeklyPushCard(activeThursItem);
    document.getElementById('weekly-push-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

window.resetToCurrentThurs = function() {
  if (feedData && feedData.current_thursday) {
    activeThursItem = feedData.current_thursday;
    renderWeeklyPushCard(activeThursItem);
  }
};

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

// 2. 渲染「週末主打看系」
function renderWeekendFocus() {
  const currentDept = feedData ? feedData.current_weekend : null;
  const historyDepts = feedData ? feedData.history_weekends : [];

  const focusContainer = document.getElementById('weekend-focus-card');
  const historyWrapper = document.getElementById('weekend-history-wrapper');
  const historyListContainer = document.getElementById('weekend-history-list');

  if (!currentDept) {
    focusContainer.innerHTML = `
      <div style="text-align: center; padding: 30px 20px; color: var(--text-muted);">
        <p style="font-size: 1rem;">🌱 首期週末主打即將發布，敬請期待！</p>
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
      <div>
        <button class="btn btn-sm" id="btn-expand-schools" onclick="toggleSchoolsList('${currentDept.group_name}')" style="background: var(--text-headline);">
          展開開設校系與官方網站 ▼
        </button>
      </div>

      <div id="dept-inline-schools" style="display: none; margin-top: 18px; border-top: 1px dashed var(--border-delicate); padding-top: 14px; max-height: 400px; overflow-y: auto;">
      </div>
    `;
  }

  // 歷史科系折疊區
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
          <button class="btn btn-outline btn-sm" onclick="showHistoryDeptDetail('${dept.group_name}')">
            看內容 ➔
          </button>
        </div>
      `;
    }).join('');
  }
}

// 原位展開校系列表（支援併群與孤兒專輯）
window.toggleSchoolsList = function(groupName) {
  const container = document.getElementById('dept-inline-schools');
  const btn = document.getElementById('btn-expand-schools');
  if (!container || !btn) return;

  if (container.style.display === 'block') {
    container.style.display = 'none';
    btn.textContent = '展開開設校系與官方網站 ▼';
  } else {
    container.style.display = 'block';
    btn.textContent = '收合開設校系列表 ▲';
    renderInlineSchools(groupName, container);
  }
};

function renderInlineSchools(groupName, container) {
  if (!deptDrawData || !deptDrawData.groups) {
    container.innerHTML = '<p style="text-align:center; padding:10px; color:var(--text-muted);">正在載入校系資料...</p>';
    return;
  }

  // 若為孤兒專輯
  let matchedItems = [];
  if (groupName.includes('特色唯一專輯')) {
    // 找出所有 1 校的稀有學系
    const singles = deptDrawData.groups.filter(g => g.schools === 1);
    matchedItems = singles.flatMap(g => g.items || []).slice(0, 10);
  } else {
    const matched = deptDrawData.groups.find(g => g.name === groupName || groupName.includes(g.name) || g.name.includes(groupName));
    if (matched && matched.items) {
      matchedItems = matched.items;
    }
  }

  if (matchedItems.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:10px; color:var(--text-muted);">此科系群之詳細校系資料整理中。</p>';
    return;
  }

  const schoolsCount = new Set(matchedItems.map(it => it.school)).size;

  container.innerHTML = `
    <div style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 10px; display: flex; justify-content: space-between;">
      <span>共 ${schoolsCount} 所大學開設（${matchedItems.length} 系組）</span>
      <span>115 學年度</span>
    </div>
    ${matchedItems.map(it => renderProgramRow(it)).join('')}
  `;
}

// 產生單一校系資料列（含官方首頁 / 分則頁標籤直達）
function renderProgramRow(it) {
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
      <div>${linkBadge}</div>
    </div>
  `;
}

// 回看歷史科系
window.showHistoryDeptDetail = function(groupName) {
  const historyDepts = feedData ? feedData.history_weekends : [];
  const target = historyDepts.find(d => d.group_name === groupName);
  if (target) {
    const focusContainer = document.getElementById('weekend-focus-card');
    focusContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="release-badge" style="background:#f3f0e8; color:#5c5249;">${target.day} ｜ ${target.release_date} (過往主打)</span>
        <button class="btn btn-outline btn-sm" onclick="renderWeekendFocus()" style="font-size: 0.78rem; padding: 2px 8px;">回當週主打</button>
      </div>
      <h3 style="font-size: 1.4rem; font-weight: 900; color: var(--text-headline); margin: 6px 0 8px;">
        ${target.group_name}
      </h3>
      <p style="font-size: 0.95rem; color: #475569; margin-bottom: 16px; line-height: 1.6;">
        ${target.desc}
      </p>
      <div>
        <button class="btn btn-sm" id="btn-expand-schools" onclick="toggleSchoolsList('${target.group_name}')" style="background: var(--text-headline);">
          展開開設校系與官方網站 ▼
        </button>
      </div>
      <div id="dept-inline-schools" style="display: none; margin-top: 18px; border-top: 1px dashed var(--border-delicate); padding-top: 14px; max-height: 400px; overflow-y: auto;">
      </div>
    `;
    focusContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

window.toggleWeekendHistory = function() {
  const c = document.getElementById('weekend-history-drawer');
  const btn = document.getElementById('toggle-weekend-history-btn');
  if (c.style.display === 'none' || c.style.display === '') {
    c.style.display = 'block';
    btn.textContent = '收合過往主打 ▲';
  } else {
    c.style.display = 'none';
    btn.textContent = '展開過往主打 ▼';
  }
};

// 3. 全台 2,178 校系即時檢索
function renderInitialSearchResults() {
  const container = document.getElementById('search-results-container');
  if (!container) return;
  const initial = allProgramsList.slice(0, 50);
  container.innerHTML = initial.map(it => renderProgramRow(it)).join('');
}

window.handleDeptSearch = function() {
  const q = document.getElementById('dept-search-input').value.trim().toLowerCase();
  const container = document.getElementById('search-results-container');
  const countEl = document.getElementById('search-result-count');
  if (!container) return;

  if (!q) {
    renderInitialSearchResults();
    if (countEl) countEl.textContent = '顯示前 50 筆';
    return;
  }

  const filtered = allProgramsList.filter(it => {
    return it.school.toLowerCase().includes(q) ||
           it.dept.toLowerCase().includes(q) ||
           it.subjects.toLowerCase().includes(q) ||
           it.groupName.toLowerCase().includes(q);
  });

  if (countEl) {
    countEl.textContent = `找到 ${filtered.length} 筆結果`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
        <p>查無符合「${q}」的校系</p>
        <span style="font-size: 0.8rem; margin-top: 4px; display: block;">請嘗試簡稱（例如：臺大、資工、醫學）</span>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.slice(0, 100).map(it => renderProgramRow(it)).join('');
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

// PWA 註冊與安裝
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js?v=20280114-clean3').catch(e => console.log('SW error:', e));
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
    alert('手機瀏覽可點選瀏覽器選單「加入主畫面」安裝成桌面圖示。');
  }
};
