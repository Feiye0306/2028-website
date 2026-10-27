// 2028 學測家長陪跑日曆 - 核心邏輯
let countdownData = null;
let weekendReleases = null;
let deptDrawData = null;
let deptLinks = null;

let currentStageIndex = 0;
let deferredPrompt = null;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  registerServiceWorker();
  setupPwaBanner();

  await loadAllData();

  initCountdown();
  renderWeeklyPush();
  renderWeekendReleases();
  renderDeptBrowser();

  // 每秒更新倒數
  setInterval(updateCountdownDisplay, 1000);
});

// 載入資料包
async function loadAllData() {
  try {
    const [cdRes, wrRes, dddRes, dlRes] = await Promise.all([
      fetch('./data/countdown_data.json').then(r => r.json()),
      fetch('./data/weekend_releases.json').then(r => r.json()),
      fetch('./data/dept_draw_data.json').then(r => r.json()),
      fetch('./data/dept_links.json').then(r => r.json())
    ]);
    countdownData = cdRes;
    weekendReleases = wrRes;
    deptDrawData = dddRes;
    deptLinks = dlRes;
  } catch (err) {
    console.error('資料載入失敗：', err);
  }
}

// 倒數計時計算
const EXAM_DATE = new Date('2028-01-21T09:00:00+08:00');

function updateCountdownDisplay() {
  const now = new Date();
  const diff = EXAM_DATE - now;

  if (diff <= 0) {
    document.getElementById('days-num').textContent = '0';
    document.getElementById('hours-num').textContent = '00';
    document.getElementById('mins-num').textContent = '00';
    document.getElementById('secs-num').textContent = '00';
    document.getElementById('calc-weeks-badge').textContent = '已迎戰學測！';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  const remainWeeks = Math.ceil(days / 7);

  document.getElementById('days-num').textContent = days;
  document.getElementById('hours-num').textContent = String(hours).padStart(2, '0');
  document.getElementById('mins-num').textContent = String(mins).padStart(2, '0');
  document.getElementById('secs-num').textContent = String(secs).padStart(2, '0');
  document.getElementById('calc-weeks-badge').textContent = `約剩 ${remainWeeks} 週`;
}

function initCountdown() {
  updateCountdownDisplay();
}

// 每週四推播渲染
function renderWeeklyPush() {
  if (!countdownData || !countdownData.stages) return;

  const stage = countdownData.stages[currentStageIndex];
  if (!stage) return;

  const container = document.getElementById('weekly-push-container');
  
  // 挑選當前階段對應問答
  const questionsList = stage.questions.map(q => `<li>${q}</li>`).join('');

  container.innerHTML = `
    <div class="push-header">
      <span class="push-tag">📌 ${stage.stage}</span>
      <span style="font-size: 0.82rem; color: var(--text-muted);">${stage.weeks}（${stage.months}）</span>
    </div>
    <h3 class="push-title">「${stage.sample_push}」</h3>
    
    <div class="action-block">
      <h4>🎯 本階段・學生適合做什麼</h4>
      <p>${stage.student_task}</p>
    </div>

    <div class="action-block">
      <h4>☕ 本階段・家長適合做什麼</h4>
      <p>${stage.parent_task}</p>
    </div>

    <div class="qa-card">
      <h4>💡 本階段家長關鍵解惑（精選題庫）</h4>
      <ul style="padding-left: 20px; font-size: 0.92rem; color: #78350f; line-height: 1.6;">
        ${questionsList}
      </ul>
    </div>
  `;

  document.getElementById('stage-pager-text').textContent = 
    `階段 ${currentStageIndex + 1} / ${countdownData.stages.length}`;
}

// 階段切換按鈕
window.changeStage = function(offset) {
  if (!countdownData || !countdownData.stages) return;
  const newIndex = currentStageIndex + offset;
  if (newIndex >= 0 && newIndex < countdownData.stages.length) {
    currentStageIndex = newIndex;
    renderWeeklyPush();
  }
};

// 週末科系發布渲染
function renderWeekendReleases() {
  if (!weekendReleases) return;

  const container = document.getElementById('weekend-releases-list');
  container.innerHTML = weekendReleases.map(item => {
    return `
      <div class="release-list-item">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span class="weekend-badge">${item.day}・${item.date}</span>
          <span style="font-size: 0.8rem; font-weight: 600; color: #475569;">${item.tag}</span>
        </div>
        <h3 style="font-size: 1.15rem; color: var(--primary); margin-bottom: 6px;">${item.group}</h3>
        <p style="font-size: 0.92rem; color: #334155; margin-bottom: 6px;">${item.desc}</p>
        <div style="font-size: 0.86rem; color: #0284c7; background: #f0f9ff; padding: 6px 10px; border-radius: 6px; margin-bottom: 10px;">
          <strong>焦點特色：</strong>${item.highlight}
        </div>
        <button class="btn btn-secondary btn-sm" onclick="viewGroupDetail('${item.group}')">
          查看全台開設校系與官方首頁 ➔
        </button>
      </div>
    `;
  }).join('');
}

// 點擊查看特定科系群詳情
window.viewGroupDetail = function(groupName) {
  // 切換至科系庫分頁並過濾
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

  // 篩選群組
  const filtered = deptDrawData.groups.filter(group => {
    // 依群名或底下校系過濾
    const matchGroup = group.name.toLowerCase().includes(keyword);
    const matchItems = group.items.some(it => 
      it.school.toLowerCase().includes(keyword) || 
      it.dept.toLowerCase().includes(keyword)
    );
    const matchKeyword = !keyword || matchGroup || matchItems;

    // 依考科過濾
    let matchSub = true;
    if (activeSubject) {
      matchSub = group.items.some(it => it.subjects && it.subjects.includes(activeSubject));
    }

    return matchKeyword && matchSub;
  });

  // 限制前 30 群展示以保持滑動順暢
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
        // 查找連結
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

// 快速考科過濾標籤
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

// PWA 註冊與推播模擬
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('ServiceWorker 註冊成功');
    }).catch(err => {
      console.log('ServiceWorker 註冊失敗：', err);
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
    alert('若使用手機瀏覽，可點選瀏覽器選單「加入主畫面」，即可像 App 一樣安裝與每週接收推播！');
  }
};

window.triggerPushTest = function() {
  if (!('Notification' in window)) {
    alert('您的瀏覽器不支援通知功能。');
    return;
  }
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      const stage = countdownData && countdownData.stages ? countdownData.stages[currentStageIndex] : null;
      const title = '🔔 2028 學測家長陪跑推播';
      const body = stage ? `【${stage.stage}】${stage.sample_push}` : '學測倒數陪跑已啟動，每週四為您推播重要時程！';
      new Notification(title, { body, icon: './manifest.json' });
    } else {
      alert('請先在瀏覽器設定中允許通知權限，才能接收每週四推播。');
    }
  });
};
