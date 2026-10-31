/**
 * 2028 學測作戰地圖 ｜ 前台主腳本
 * 全台 2,178 個系組全收錄
 */

const EXAM_DATE_STR = '2028-01-14';

// 移除題目開頭題號與舊序號（家長端嚴禁外露內部題號）
function stripNumberPrefix(str) {
  if (!str) return '';
  return str.replace(/^#\d+\s*(?:[◎●★]\s*)?/, '').replace(/^\d+\.\s*/, '').trim();
}

// 格式化答案內文（轉義超連結、保留清晰換行段落）
function formatAnswerHtml(text) {
  if (!text) return '';
  
  // 轉義 HTML 標籤
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 將 URL 轉為點擊超連結
  const urlRegex = /(https?:\/\/[^\s\n\r<]+)/g;
  safe = safe.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  return safe;
}

// 計算距學測週數
function updateCountdown() {
  const examDate = new Date(EXAM_DATE_STR + 'T00:00:00+08:00');
  const now = new Date();
  const diffTime = examDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.max(0, Math.ceil(diffDays / 7));

  const el = document.getElementById('weeks-num');
  if (el) el.textContent = weeks;
}

let faqMasterData = null;
let currentActiveWeekNum = 1;

// 取得台灣當前日期字串 (YYYY-MM-DD)
function getTodayString() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const twDate = new Date(utc + (3600000 * 8));
  return twDate.toISOString().split('T')[0];
}

// 載入 FAQ 資料
async function loadFaqData() {
  try {
    const res = await fetch('./data/faq_data.json?v=' + Date.now());
    if (res.ok) {
      faqMasterData = await res.json();
    }
  } catch (err) {
    console.warn('無法從網路讀取 faq_data.json，回退到預設第一批資料：', err);
  }

  // 備援預設第一週資料 (順序嚴格照排，無任何題號與內部備註)
  if (!faqMasterData || !faqMasterData.weeks || faqMasterData.weeks.length === 0) {
    faqMasterData = {
      weeks: [
        {
          week: 1,
          release_date: "2027-02-04",
          stage: "高二下打底",
          questions: [
            {
              id: 2,
              question: "高二開始準備學測會太早嗎？總複習應該從什麼時候開始？高二下才開始來得及嗎？",
              answer: "- 不會太早，但高二的「準備」不是衝刺，是打地基：跟上學校進度、把觀念漏洞補起來；學測範圍本來就以高一高二內容為主體。\n- 高二下開始來得及：關鍵在有沒有系統地複習。每週固定撥時間回顧舊範圍，比假日一次爆讀更有效。\n- 避免太早燃燒殆盡：學測是長跑，高二拚到沒電、高三反而撐不住；節奏感比強度重要。\n- 家長可以幫的：幫他守住作息和睡眠，盯生活節奏勝過盯進度；進度落後時先陪他把計畫拆小，而不是加壓。\n- 高二下可先做兩件小事：開始累積需要時間的東西（例如英文單字、國文古文），並慢慢看目標校系的參採科目，確認自己的選考組合沒問題。",
              folded: []
            },
            {
              id: 12,
              question: "學測到底要考幾科？可以只選考其中幾科嗎？自然組也要考社會、社會組也要考自然嗎？",
              answer: "一句話結論：學測共6科、可以自由選考只報需要的科；但沒考的科目，校系有採計就等於沒成績，所以實務上多數人仍報4到6科。\n\n重點：\n- 6科是國文、英文、數學A、數學B、社會、自然；國文分國綜、國寫兩節考，但合併算1科級分，不是2科\n- 只報1科到6科全報都可以，沒有規定必考幾科；報名費按選考科數計算\n- 自然組、社會組只是校內分組，大考中心不按組別強制考科：自然組不必考社會，社會組不必考自然",
              folded: []
            },
            {
              id: 13,
              question: "學測考幾天？國文、英文、數學、社會、自然各考多久？",
              answer: "一句話結論：學測考3天，每科90到110分鐘；115學年度是2026/1/17–1/19，116學年度是2027/1/22–1/24。\n\n重點：\n- 115日程：第1天數學A、自然；第2天英文、國綜、國寫；第3天數學B、社會（每年順序以當年簡章為準）\n- 國綜90分鐘、國寫90分鐘\n- 英文、數學A、數學B各100分鐘\n- 社會、自然各110分鐘",
              folded: []
            }
          ]
        }
      ]
    };
  }
}

// 渲染問答畫面
function renderFaqView() {
  if (!faqMasterData || !faqMasterData.weeks) return;

  const today = getTodayString();
  const allWeeks = faqMasterData.weeks;

  // 決定已發布週次：第 1 週直接發布；第 2 週起依日期
  const publishedWeeks = allWeeks.filter(w => {
    if (w.week === 1) return true;
    return today >= w.release_date;
  });

  if (publishedWeeks.length === 0) return;

  // 當前選中的週次（預設最新已發布週）
  let targetWeek = publishedWeeks.find(w => w.week === currentActiveWeekNum);
  if (!targetWeek) {
    targetWeek = publishedWeeks[publishedWeeks.length - 1];
    currentActiveWeekNum = targetWeek.week;
  }

  // 階段與週次標籤（純資訊）
  const stageEl = document.getElementById('cur-week-stage');
  if (stageEl) {
    stageEl.textContent = `第 ${targetWeek.week} 週 ｜ ${targetWeek.stage}`;
  }

  // 渲染問答（大標題、細線分隔、無任何多餘英文抬頭與題號）
  const faqListContainer = document.getElementById('faq-list-container');
  if (faqListContainer) {
    let html = '';
    targetWeek.questions.forEach((q) => {
      const cleanTitle = stripNumberPrefix(q.question);
      const answerHtml = formatAnswerHtml(q.answer);

      // 摺疊題：收在主問底下，不獨立出現；摘要文字即題目本身
      let foldedHtml = '';
      if (q.folded && q.folded.length > 0) {
        foldedHtml = `
          <div class="faq-folded-wrapper">
            ${q.folded.map(f => `
              <details class="faq-folded-item">
                <summary class="faq-folded-summary">
                  <span>${stripNumberPrefix(f.question)}</span>
                </summary>
                <div class="faq-folded-content">
                  ${formatAnswerHtml(f.answer)}
                </div>
              </details>
            `).join('')}
          </div>
        `;
      }

      html += `
        <article class="faq-card">
          <h2 class="faq-question-title">${cleanTitle}</h2>
          <div class="faq-answer-body">${answerHtml}</div>
          ${foldedHtml}
        </article>
      `;
    });

    faqListContainer.innerHTML = html;
  }

  // 歷史抽屜：僅在歷史週次數量 > 0 時呈現
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
            <div class="history-week-block">
              <div class="history-week-header">
                <span>第 ${hw.week} 週 ｜ ${hw.stage} (${hw.release_date})</span>
                <button onclick="selectWeek(${hw.week})" style="background: transparent; border: 1px solid var(--accent); color: var(--accent); font-size: 0.8rem; padding: 2px 8px; border-radius: 2px; cursor: pointer;">
                  查看此週
                </button>
              </div>
              ${hw.questions.map(hq => `
                <div class="history-q-row">
                  <div class="history-q-text" onclick="toggleHistoryAnswer(this)">
                    ・${stripNumberPrefix(hq.question)}
                  </div>
                  <div class="history-q-answer">
                    ${formatAnswerHtml(hq.answer)}
                  </div>
                </div>
              `).join('')}
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

// 抽屜切換
window.toggleHistoryDrawer = function() {
  const panel = document.getElementById('history-drawer-panel');
  const btn = document.getElementById('drawer-toggle-btn');
  if (!panel || !btn) return;

  const isOpen = panel.classList.toggle('is-open');
  btn.textContent = isOpen ? '收起' : '開啟';
};

// 歷史題目單題答案展開
window.toggleHistoryAnswer = function(el) {
  const ansEl = el.nextElementSibling;
  if (ansEl) {
    const isShowing = ansEl.style.display === 'block';
    ansEl.style.display = isShowing ? 'none' : 'block';
  }
};

// 切換查看指定週次
window.selectWeek = function(weekNum) {
  currentActiveWeekNum = weekNum;
  renderFaqView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 註冊 Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('SW 註冊注意：', err);
    });
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  updateCountdown();
  await loadFaqData();
  renderFaqView();
  registerServiceWorker();
});
