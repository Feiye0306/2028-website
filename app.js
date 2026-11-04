/**
 * 2028 學測作戰地圖 ｜ Liquid Glass 清透透鏡版主腳本
 * 依據：handover/2028-website/design_glass_v1/spec_v1.md
 */

const EXAM_DATE_STR = '2028-01-14';

// 移除題目內部題號與工作代號（家長端嚴格禁止外露）
function stripNumberPrefix(str) {
  if (!str) return '';
  return str.replace(/^#\d+\s*(?:[◎●★]\s*)?/, '').replace(/^\d+\.\s*/, '').trim();
}

// 格式化答案內文（轉義、超連結轉換、自然標準段落）
function formatAnswerParagraphs(text) {
  if (!text) return '';
  
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const urlRegex = /(https?:\/\/[^\s\n\r<]+)/g;
  safe = safe.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  const paragraphs = safe
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${p}</p>`)
    .join('');

  return `<div class="faq-rich-paragraphs">${paragraphs}</div>`;
}

// 格式化詳細說明收合區（預設收合，只顯示小小的「詳細說明」）
function renderDetailAccordion(detail) {
  if (!detail || detail.trim() === '') return '';

  return `
    <details class="source-accordion-box" style="margin-top: 8px;">
      <summary class="source-summary-label">詳細說明</summary>
      <div style="padding-top: 8px;">
        ${formatAnswerParagraphs(detail)}
      </div>
    </details>
  `;
}

// 格式化附加資訊（詳細說明與來源）
function renderExtras(detail, sources) {
  const hasDetail = (detail && detail.trim() !== '');
  const hasSources = (sources && Array.isArray(sources) && sources.length > 0);

  if (!hasDetail && !hasSources) return '';

  if (!hasDetail && hasSources) {
    return renderSourcesAccordion(sources);
  }

  let html = `
    <details class="source-accordion-box" style="margin-top: 8px;">
      <summary class="source-summary-label">詳細說明</summary>
      <div style="padding-top: 8px;">
        ${formatAnswerParagraphs(detail)}
  `;

  if (hasSources) {
    const items = sources.map(s => {
      const title = s.title || s.url;
      return `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${title}</a></li>`;
    }).join('');

    html += `
        <div class="source-in-detail-wrap">
          <div class="source-in-detail-title">來源</div>
          <ul class="source-url-list">
            ${items}
          </ul>
        </div>
    `;
  }

  html += `
      </div>
    </details>
  `;

  return html;
}

// 格式化來源收合清單（預設收合，只顯示小小的「來源」）
function renderSourcesAccordion(sources) {
  if (!sources || !Array.isArray(sources) || sources.length === 0) return '';
  
  const items = sources.map(s => {
    const title = s.title || s.url;
    return `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${title}</a></li>`;
  }).join('');

  return `
    <details class="source-accordion-box">
      <summary class="source-summary-label">來源</summary>
      <ul class="source-url-list">
        ${items}
      </ul>
    </details>
  `;
}

// 格式化發布日期為 2027.02.04 點格式
function formatDateDots(dateStr) {
  if (!dateStr) return '';
  return dateStr.replace(/-/g, '.');
}

// 計算倒數週數
function updateCountdown() {
  const examDate = new Date(EXAM_DATE_STR + 'T00:00:00+08:00');
  const now = new Date();
  const diffTime = examDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.max(0, Math.ceil(diffDays / 7));

  const el = document.getElementById('weeks-num');
  if (el) el.textContent = weeks;
}

// 動態更新時間軸 NOW 標記位置與目前階段名
function updateTimeline() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  const indicator = document.getElementById('timeline-now-indicator');
  const caption = document.getElementById('timeline-stage-caption');

  // 時間範圍：2026年11月 ~ 2028年1月
  // 6 個主要刻度點：
  // 1. 2026.11 (0%): 高二上起跑期
  // 2. 2027.02 (20%): 高二下打底期
  // 3. 2027.05 (40%): 高二下打底期
  // 4. 2027.08 (60%): 暑假總複習
  // 5. 2027.11 (80%): 高三上衝刺
  // 6. 2028.01 (100%): 考前收尾
  if (year < 2026 || (year === 2026 && month <= 11)) {
    if (indicator) indicator.style.left = '0%';
    if (caption) caption.textContent = '高二上起跑期（學測倒數準備）';
  } else if (year === 2026 && month === 12) {
    if (indicator) indicator.style.left = '7%';
    if (caption) caption.textContent = '高二上起跑期（打穩基本盤）';
  } else if (year === 2027 && month <= 2) {
    if (indicator) indicator.style.left = '20%';
    if (caption) caption.textContent = '高二下打底期（學測國數開始複習）';
  } else if (year === 2027 && month <= 5) {
    if (indicator) indicator.style.left = '40%';
    if (caption) caption.textContent = '高二下打底期（弱科補強）';
  } else if (year === 2027 && month <= 8) {
    if (indicator) indicator.style.left = '60%';
    if (caption) caption.textContent = '暑假總複習・五科全面補強';
  } else if (year === 2027 && month <= 11) {
    if (indicator) indicator.style.left = '80%';
    if (caption) caption.textContent = '高三上衝刺・跟上模考刷題';
  } else {
    if (indicator) indicator.style.left = '100%';
    if (caption) caption.textContent = '考前收尾・倒數衝刺';
  }
}

let faqMasterData = null;
let currentActiveWeekNum = null;
let isSearchMode = false;
let isDualTabActive = false;

// 取得台灣當前日期字串 (YYYY-MM-DD)
function getTodayString() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const twDate = new Date(utc + (3600000 * 8));
  return twDate.toISOString().split('T')[0];
}

// 載入題庫資料
async function loadFaqData() {
  try {
    const res = await fetch('./data/faq_data.json?v=' + Date.now());
    if (res.ok) {
      faqMasterData = await res.json();
    }
  } catch (err) {
    console.warn('無法從網路讀取 faq_data.json，回退到預設第一批資料：', err);
  }

  if (!faqMasterData || !faqMasterData.weeks || faqMasterData.weeks.length === 0) {
    faqMasterData = {
      weeks: [
        {
          week: 1,
          release_date: "2026-10-29",
          stage: "高二下打底",
          questions: [
            {
              id: 2,
              question: "高二開始準備學測會太早嗎？總複習應該從什麼時候開始？高二下才開始來得及嗎？",
              answer: "不會太早，但高二的「準備」不是衝刺，是打地基：跟上學校進度、把觀念漏洞補起來；學測範圍本來就以高一高二內容為主體。\n\n高二下開始來得及：關鍵在有沒有系統地複習。每週固定撥時間回顧舊範圍，比假日一次爆讀更有效。\n\n避免太早燃燒殆盡：學測是長跑，高二拚到沒電、高三反而撐不住；節奏感比強度重要。\n\n家長可以幫的：幫他守住作息和睡眠，盯生活節奏勝過盯進度；進度落後時先陪他把計畫拆小，而不是加壓。\n\n高二下可先做兩件小事：開始累積需要時間的東西（例如英文單字、國文古文），並慢慢看目標校系的參採科目，確認自己的選考組合沒問題。",
              sources: [{ title: "大學入學考試中心學測各科測驗目標", url: "https://www.ceec.edu.tw/" }],
              folded: []
            },
            {
              id: 12,
              question: "學測到底要考幾科？可以只選考其中幾科嗎？自然組也要考社會、社會組也要考自然嗎？",
              answer: "學測共6科、可以自由選考只報需要的科；但沒考的科目，校系有採計就等於沒成績，所以實務上多數人仍報4到6科。\n\n重點：\n6科是國文、英文、數學A、數學B、社會、自然；國文分國綜、國寫兩節考，但合併算1科級分，不是2科。\n只報1科到6科全報都可以，沒有規定必考幾科；報名費按選考科數計算。\n自然組、社會組只是校內分組，大考中心不按組別強制考科：自然組不必考社會，社會組不必考自然。",
              sources: [{ title: "甄選入學委員會簡章總則", url: "https://www.cac.edu.tw/" }],
              folded: []
            },
            {
              id: 13,
              question: "學測考幾天？國文、英文、數學、社會、自然各考多久？",
              answer: "學測考3天，每科90到110分鐘；115學年度是2026/1/17–1/19，116學年度是2027/1/22–1/24。\n\n重點：\n115日程：第1天數學A、自然；第2天英文、國綜、國寫；第3天數學B、社會（每年順序以當年簡章為準）。\n國綜90分鐘、國寫90分鐘。\n英文、數學A、數學B各100分鐘。\n社會、自然各110分鐘。",
              sources: [{ title: "大考中心考試日程表", url: "https://www.ceec.edu.tw/" }],
              folded: []
            }
          ]
        }
      ]
    };
  }
}

// 渲染首屏問答手風琴
function renderFaqView() {
  if (isSearchMode) return;
  if (!faqMasterData || !faqMasterData.weeks) return;

  const today = getTodayString();
  const allWeeks = faqMasterData.weeks;

  const publishedWeeks = allWeeks.filter(w => {
    if (w.week === 1) return true;
    return today >= w.release_date;
  });

  if (publishedWeeks.length === 0) return;

  let targetWeek = publishedWeeks.find(w => w.week === currentActiveWeekNum);
  if (!targetWeek) {
    targetWeek = publishedWeeks[publishedWeeks.length - 1];
    currentActiveWeekNum = targetWeek.week;
  }

  // 標題列：左邊「爸媽最想問」、右邊「第 n 週・日期」
  const weekTagEl = document.getElementById('cur-week-tag');
  if (weekTagEl) {
    weekTagEl.textContent = `第 ${targetWeek.week} 週・${formatDateDots(targetWeek.release_date)}`;
  }

  const container = document.getElementById('faq-accordion-container');
  if (container) {
    let html = '';
    targetWeek.questions.forEach((q, idx) => {
      const cleanTitle = stripNumberPrefix(q.question);
      const answerHtml = formatAnswerParagraphs(q.answer);
      const extrasHtml = renderExtras(q.detail, q.sources);

      let foldedHtml = '';
      if (q.folded && q.folded.length > 0) {
        foldedHtml = `
          <div class="folded-subquestions-wrap">
            ${q.folded.map(f => `
              <details class="folded-details-item">
                <summary class="folded-summary-btn">
                  <span>${stripNumberPrefix(f.question)}</span>
                </summary>
                <div class="folded-body-content">
                  ${formatAnswerParagraphs(f.answer)}
                  ${renderExtras(f.detail, f.sources)}
                </div>
              </details>
            `).join('')}
          </div>
        `;
      }

      html += `
        <div class="faq-q-item" id="faq-item-${idx}">
          <div class="faq-q-header" onclick="toggleAccordion(${idx})">
            <h2 class="faq-q-text">${cleanTitle}</h2>
            <span class="faq-q-arrow">＋</span>
          </div>
          <!-- 答案以玻璃浮層卡打開 (套用 .glass 配方) -->
          <div class="faq-answer-floating-card glass">
            ${answerHtml}
            ${extrasHtml}
            ${foldedHtml}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // 歷史抽屜：同一個收合區
  const historyWeeks = publishedWeeks.filter(w => w.week !== targetWeek.week);
  const drawerSection = document.getElementById('history-drawer-section');
  const historyCountEl = document.getElementById('history-count');
  const historyListContainer = document.getElementById('history-list-container');

  if (drawerSection) {
    if (historyWeeks.length > 0) {
      drawerSection.style.display = 'block';
      if (historyCountEl) historyCountEl.textContent = historyWeeks.length;
      if (historyListContainer) {
        let hHtml = '';
        historyWeeks.slice().reverse().forEach(hw => {
          hHtml += `
            <div class="history-week-item">
              <div class="history-week-tag-line" onclick="toggleHistoryWeek(${hw.week})">
                <span>第 ${hw.week} 週・${formatDateDots(hw.release_date)}</span>
              </div>
              <div class="history-week-questions" id="history-week-q-${hw.week}" style="display: none; padding-top: 8px;">
                ${hw.questions.map((hq, idx) => `
                  <div class="faq-q-item" id="faq-item-hw${hw.week}-${idx}">
                    <div class="faq-q-header" onclick="toggleHistoryAccordion(${hw.week}, ${idx})">
                      <h2 class="faq-q-text">${stripNumberPrefix(hq.question)}</h2>
                      <span class="faq-q-arrow">＋</span>
                    </div>
                    <div class="faq-answer-floating-card glass">
                      ${formatAnswerParagraphs(hq.answer)}
                      ${renderExtras(hq.detail, hq.sources)}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        });
        historyListContainer.innerHTML = hHtml;
      }
    } else {
      drawerSection.style.display = 'none';
    }
  }
}

// 搜尋處理
window.handleSearch = function(query) {
  const qStr = (query || '').trim().toLowerCase();
  const clearBtn = document.getElementById('search-clear-btn');
  const feedbackEl = document.getElementById('search-feedback');
  const container = document.getElementById('faq-accordion-container');
  const drawerSection = document.getElementById('history-drawer-section');

  if (!qStr) {
    isSearchMode = false;
    if (clearBtn) clearBtn.style.display = 'none';
    if (feedbackEl) feedbackEl.style.display = 'none';
    renderFaqView();
    return;
  }

  isSearchMode = true;
  if (clearBtn) clearBtn.style.display = 'block';
  if (drawerSection) drawerSection.style.display = 'none';

  if (!faqMasterData || !faqMasterData.weeks) return;

  const results = [];
  const today = getTodayString();
  faqMasterData.weeks.forEach(w => {
    if (w.week !== 1 && today < w.release_date) return;
    w.questions.forEach(q => {
      const qText = (q.question || '').toLowerCase();
      const aText = (q.answer || '').toLowerCase();
      if (qText.includes(qStr) || aText.includes(qStr)) {
        results.push({ ...q, week: w.week, release_date: w.release_date });
      }
    });
  });

  if (feedbackEl) {
    feedbackEl.style.display = 'block';
    feedbackEl.textContent = `找到 ${results.length} 則已發布問題`;
  }

  if (container) {
    if (results.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px 0; text-align: center; color: var(--text-muted); font-size: 1rem;">
          未找到與「${query}」相符的已發布問題。
        </div>
      `;
      return;
    }

    let html = '';
    results.forEach((q, idx) => {
      const cleanTitle = stripNumberPrefix(q.question);
      html += `
        <div class="faq-q-item" id="faq-item-${idx}">
          <div class="faq-q-header" onclick="toggleAccordion(${idx})">
            <h2 class="faq-q-text">${cleanTitle}</h2>
            <span class="faq-q-arrow">＋</span>
          </div>
          <div class="faq-answer-floating-card glass">
            <div style="font-size: 0.85rem; color: var(--accent-orange); margin-bottom: 8px; font-weight: 700;">
              收錄於第 ${q.week} 週
            </div>
            ${formatAnswerParagraphs(q.answer)}
            ${renderSourcesAccordion(q.sources)}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }
};

window.clearSearch = function() {
  const input = document.getElementById('faq-search-input');
  if (input) input.value = '';
  window.handleSearch('');
};

// 手風琴切換：點新題自動收上一題
window.toggleAccordion = function(itemIdx) {
  const container = document.getElementById('faq-accordion-container');
  if (!container) return;

  const targetItem = document.getElementById(`faq-item-${itemIdx}`);
  if (!targetItem) return;

  const isAlreadyActive = targetItem.classList.contains('is-active');
  const targetTopBeforeToggle = targetItem.getBoundingClientRect().top;

  const allItems = container.querySelectorAll('.faq-q-item');
  allItems.forEach(item => {
    item.classList.remove('is-active');
  });

  if (!isAlreadyActive) {
    targetItem.classList.add('is-active');
  }

  // 若收合該題，且該題已被捲動到視窗頂端之上（被 sticky 卡住或更上方），則捲回該題位置
  if (isAlreadyActive && targetTopBeforeToggle < 0) {
    window.scrollTo({
      top: window.scrollY + targetTopBeforeToggle,
      behavior: 'auto'
    });
  }
};

// 抽屜切換
window.toggleHistoryDrawer = function() {
  const panel = document.getElementById('history-drawer-panel');
  const btn = document.getElementById('drawer-toggle-btn');
  if (!panel || !btn) return;

  const isOpen = panel.classList.toggle('is-open');
  btn.textContent = isOpen ? '收起' : '開啟';
};

window.toggleHistoryWeek = function(weekNum) {
  const allContainers = document.querySelectorAll('.history-week-questions');
  const targetContainer = document.getElementById(`history-week-q-${weekNum}`);

  let wasOpen = false;
  if (targetContainer && targetContainer.style.display === 'block') {
    wasOpen = true;
  }

  allContainers.forEach(el => {
    el.style.display = 'none';
  });

  if (targetContainer && !wasOpen) {
    targetContainer.style.display = 'block';
  }
};

window.toggleHistoryAccordion = function(weekNum, itemIdx) {
  const container = document.getElementById(`history-week-q-${weekNum}`);
  if (!container) return;

  const targetItem = document.getElementById(`faq-item-hw${weekNum}-${itemIdx}`);
  if (!targetItem) return;

  const isAlreadyActive = targetItem.classList.contains('is-active');
  const targetTopBeforeToggle = targetItem.getBoundingClientRect().top;

  const allItems = container.querySelectorAll('.faq-q-item');
  allItems.forEach(item => {
    item.classList.remove('is-active');
  });

  if (!isAlreadyActive) {
    targetItem.classList.add('is-active');
  }

  // 若收合該題，且該題已被捲動到視窗頂端之上（被 sticky 卡住或更上方），則捲回該題位置
  if (isAlreadyActive && targetTopBeforeToggle < 0) {
    window.scrollTo({
      top: window.scrollY + targetTopBeforeToggle,
      behavior: 'auto'
    });
  }
};

window.selectWeek = function(weekNum) {
  currentActiveWeekNum = weekNum;
  renderFaqView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 底部膠囊雙分頁開關控制
window.switchMainTab = function(tabKey) {
  const faqSec = document.getElementById('view-faq-section');
  const deptSec = document.getElementById('view-dept-section');
  const faqBtn = document.getElementById('tab-faq-btn');
  const deptBtn = document.getElementById('tab-dept-btn');

  if (tabKey === 'dept') {
    if (faqSec) faqSec.style.display = 'none';
    if (deptSec) deptSec.style.display = 'block';
    if (faqBtn) faqBtn.classList.remove('is-active');
    if (deptBtn) deptBtn.classList.add('is-active');
  } else {
    if (faqSec) faqSec.style.display = 'block';
    if (deptSec) deptSec.style.display = 'none';
    if (faqBtn) faqBtn.classList.add('is-active');
    if (deptBtn) deptBtn.classList.remove('is-active');
  }
};

// 控制底部開關是否出現（預設只有「爸媽最想問」時隱藏；科系上線時顯示）
window.setDepartmentTabVisible = function(visible) {
  const wrap = document.getElementById('bottom-tab-wrap');
  if (wrap) {
    wrap.style.display = visible ? 'flex' : 'none';
    isDualTabActive = !!visible;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  updateCountdown();
  updateTimeline();
  await loadFaqData();
  renderFaqView();

  // 若 URL 帶有 ?tab=dept 或 ?dual=1，開啟雙分頁展示模式
  const params = new URLSearchParams(window.location.search);
  if (params.get('dual') === '1' || params.get('tab') === 'dept') {
    window.setDepartmentTabVisible(true);
    if (params.get('tab') === 'dept') {
      window.switchMainTab('dept');
    }
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('SW:', err);
    });
  }
});
