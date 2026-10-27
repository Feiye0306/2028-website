// 2028 學測家長陪跑日曆 - 人文誌極致版 (Editorial Edition)
let masterSchedule = null;
let deptDrawData = null;
let deptLinks = null;

let currentThursIndex = 0;
let deferredPrompt = null;
let currentAdminTab = 'thurs';

// 錨定學測預估日：2028 年 1 月 14 日
const EXAM_DATE = new Date('2028-01-14T09:00:00+08:00');

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  registerServiceWorker();
  setupPwaBanner();

  await loadAllData();

  updateCountdownDisplay();
  applyScheduleFilter();
  renderDeptBrowser();

  // 定時微調週數
  setInterval(updateCountdownDisplay, 60000);
});

// 載入資料包（物理防洩密：前台僅讀取脫敏 public_feed.json）
async function loadAllData() {
  try {
    const [schedRes, dddRes, dlRes] = await Promise.all([
      fetch('./data/public_feed.json?v=' + Date.now()).then(r => r.json()),
      fetch('./data/dept_draw_data.json').then(r => r.json()),
      fetch('./data/dept_links.json').then(r => r.json())
    ]);
    masterSchedule = schedRes;
    deptDrawData = dddRes;
    deptLinks = dlRes;
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

// 依據排程日期過濾與渲染
function applyScheduleFilter() {
  if (!masterSchedule || !masterSchedule.thursday_releases) return;

  const todayStr = new Date().toISOString().slice(0, 10);

  // 找出目前最新已解鎖的週四期數
  let latestUnlockedIdx = 0;
  masterSchedule.thursday_releases.forEach((item, idx) => {
    if (item.is_unlocked) {
      latestUnlockedIdx = idx;
    }
  });

  currentThursIndex = latestUnlockedIdx;
  renderWeeklyPush();
  renderWeekendReleases();
}

// 渲染當週指南卡片（社論雜誌風）
function renderWeeklyPush() {
  if (!masterSchedule || !masterSchedule.thursday_releases) return;

  const item = masterSchedule.thursday_releases[currentThursIndex];
  if (!item) return;

  const container = document.getElementById('weekly-push-container');

  if (!item.is_unlocked) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; background: #faf9f6; border: 1px dashed #e8e6df; border-radius: 12px;">
        <div style="font-size: 2rem; margin-bottom: 8px;">⏳</div>
        <h3 style="color: var(--text-headline); font-size: 1.1rem; margin-bottom: 6px;">本週指引排程解鎖中</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.5;">
          預定於 <strong>${item.release_date}（${item.day}）</strong> 準時發布。<br>
          每週四釋出一道關鍵解惑，陪伴您與孩子穩健前進。
        </p>
      </div>
    `;
  } else {
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
  }

  document.getElementById('stage-pager-text').textContent = 
    `第 ${item.index} 週 ｜ 倒數 ${item.countdown_weeks} 週`;
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

// 渲染週末科系發布（排程鎖定機制）
function renderWeekendReleases() {
  if (!masterSchedule || !masterSchedule.weekend_releases) return;

  const container = document.getElementById('weekend-releases-list');
  const items = masterSchedule.weekend_releases;

  container.innerHTML = items.map(item => {
    if (!item.is_unlocked) {
      return `
        <div class="release-item" style="opacity: 0.6;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="release-badge">${item.day} ｜ ${item.release_date}</span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">排程鎖定</span>
          </div>
          <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-muted); margin-top: 6px;">
            第 ${item.slot_num} 格：即將於 ${item.release_date} 解鎖
          </div>
        </div>
      `;
    }

    return `
      <div class="release-item">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="release-badge" style="background:#eef7f2; color:#1b633e;">${item.day} ｜ ${item.release_date}</span>
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">${item.tag}</span>
        </div>
        <div class="release-dept-title">${item.group_name}</div>
        <p style="font-size: 0.9rem; color: #475569; margin: 4px 0 10px; line-height: 1.5;">${item.desc}</p>
        <button class="btn btn-outline btn-sm" onclick="viewGroupDetail('${item.group_name}')">
          查看全台開設校系與官方連結 ➔
        </button>
      </div>
    `;
  }).join('');
}

// 點擊查看特定科系
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

// 導航切換
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

// ==================== 雲端管理工作台 ====================
let adminAuthenticated = false;

window.openAdminLogin = function() {
  if (!adminAuthenticated) {
    const pwd = prompt('請輸入負責人雲端管理金鑰：');
    if (pwd === 'winner2028' || pwd === 'darry') {
      adminAuthenticated = true;
    } else if (pwd !== null) {
      alert('⚠️ 管理金鑰錯誤。');
      return;
    } else {
      return;
    }
  }
  const modal = document.getElementById('admin-cloud-modal');
  if (modal) {
    modal.style.display = 'flex';
    renderAdminContent();
  }
};

window.closeAdminModal = function() {
  const modal = document.getElementById('admin-cloud-modal');
  if (modal) modal.style.display = 'none';
};

window.switchAdminTab = function(type) {
  currentAdminTab = type;
  document.getElementById('tab-btn-thurs').classList.toggle('active', type === 'thurs');
  document.getElementById('tab-btn-weekend').classList.toggle('active', type === 'weekend');
  renderAdminContent();
};

function renderAdminContent() {
  if (!masterSchedule) return;
  const contentEl = document.getElementById('cloud-admin-content');
  const cutoffEl = document.getElementById('cloud-cutoff-text');
  if (cutoffEl) cutoffEl.textContent = masterSchedule.cutoff_date || '2026-10-31';

  if (currentAdminTab === 'thurs') {
    contentEl.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th style="width: 50px;">週次</th>
            <th style="width: 110px;">公開日期</th>
            <th>公開題目（家長關鍵解惑）</th>
            <th style="width: 80px;">狀態</th>
            <th style="width: 70px;">操作</th>
          </tr>
        </thead>
        <tbody>
          ${masterSchedule.thursday_releases.map((it, idx) => `
            <tr>
              <td>第 ${it.index} 週</td>
              <td>${it.release_date}</td>
              <td>${it.question || '🔒 [未公開・庫房保護]'}</td>
              <td>${it.is_unlocked ? '✅ 已解鎖' : '🔒 隔離中'}</td>
              <td><button class="btn btn-outline btn-sm" onclick="editThursQ(${idx})">編輯</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else {
    contentEl.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th style="width: 50px;">格次</th>
            <th style="width: 120px;">公開日期</th>
            <th>發布科系群組</th>
            <th style="width: 90px;">排序調整</th>
          </tr>
        </thead>
        <tbody>
          ${masterSchedule.weekend_releases.map((it, idx) => `
            <tr>
              <td>第 ${it.slot_num} 格</td>
              <td>${it.release_date} (${it.day})</td>
              <td><strong>${it.group_name || '🔒 [未公開・庫房保護]'}</strong></td>
              <td>
                <button class="btn btn-outline btn-sm" onclick="moveWeekendOrder(${idx}, -1)">▲</button>
                <button class="btn btn-outline btn-sm" onclick="moveWeekendOrder(${idx}, 1)">▼</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

window.editThursQ = function(idx) {
  const it = masterSchedule.thursday_releases[idx];
  const newQ = prompt(`編輯第 ${it.index} 週題目：`, it.question || '');
  if (newQ) {
    it.question = newQ;
    renderAdminContent();
    renderWeeklyPush();
  }
};

window.moveWeekendOrder = function(idx, dir) {
  const targetIdx = idx + dir;
  const list = masterSchedule.weekend_releases;
  if (targetIdx < 0 || targetIdx >= list.length) return;
  const temp = list[idx].group_name;
  list[idx].group_name = list[targetIdx].group_name;
  list[targetIdx].group_name = temp;
  renderAdminContent();
};

window.exportAdminSchedule = function() {
  const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(masterSchedule, null, 2));
  const dl = document.createElement('a');
  dl.setAttribute("href", str);
  dl.setAttribute("download", "master_schedule.json");
  dl.click();
};

// PWA 註冊與通知
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js?v=20280114').catch(e => console.log('SW error:', e));
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
    const item = masterSchedule && masterSchedule.thursday_releases ? masterSchedule.thursday_releases[currentThursIndex] : null;
    const title = '🔔 2028 學測家長陪跑日曆';
    const body = item && item.question ? `【${item.stage}】${item.question}` : '每週四指引已發布，點擊查看本週解惑！';
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
