/**
 * 2028 學測作戰地圖 ｜ 前台主腳本 v1
 * 依考程時序每週精選家長關鍵問答，全台 2,178 個系組全收錄
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

  // 備援預設第一週資料 (順序嚴格照排)
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
              answer: "【查證答案 2026-10-20】\n✅ 一句話結論：高二開始不算太早，但「開始的方式」決定成敗。高二的重點不是狂刷歷屆試題，而是穩住高二進度、補強英文單字與基本運算，並開始了解學測架構。\n\n重點建議：\n- 高二課程就是學測的一半範圍（國英數社自的第四冊皆在高二），顧好段考就是最好的學測打底。\n- 英文單字請立即啟動每天固定量（如 15～20 字），英文是無法短期速成的考科。\n- 高二升高三的暑假（黃金七月）才是大範圍總複習的全力衝刺期。",
              folded: []
            },
            {
              id: 12,
              question: "學測到底要考幾科？可以只選考其中幾科嗎？自然組也要考社會、社會組也要考自然嗎？",
              answer: "【查證答案 2026-10-20】\n✅ 一句話結論：學測共 6 科（國文、英文、數A、數B、社會、自然），考生採「自由選考」，完全不必 6 科全報！\n\n重點：\n- 自由選考：大學校系在個人申請時，最多只能採計 4 科（不可 5 科或 6 科全採）。\n- 自然組多半選考：國、英、數A、自然。\n- 社會組多半選考：國、英、數B、社會。\n- 是否跨考：可依目標校系採計標準決定，不必盲目跨考增加負擔。",
              folded: []
            },
            {
              id: 13,
              question: "學測考幾天？國文、英文、數學、社會、自然各考多久？",
              answer: "【查證答案 2026-10-20】\n✅ 一句話結論：學測固定考 3 天，時間多在 1 月中下旬（週五、週六、週日）。\n\n考試科目與時間：\n- 國文綜合（國綜）：90 分鐘\n- 國文寫作（國寫）：90 分鐘（國綜與國寫分節施測，成績各占 50% 合併為國文科 15 級分）\n- 英文：100 分鐘\n- 數學 A：100 分鐘\n- 數學 B：100 分鐘\n- 社會：110 分鐘\n- 自然：110 分鐘",
              folded: []
            }
          ]
        }
      ]
    };
  }
}

// 核心渲染：分流「本週問答」與「歷史抽屜」
function renderFaqView() {
  if (!faqMasterData || !faqMasterData.weeks) return;

  const today = getTodayString();
  const allWeeks = faqMasterData.weeks;

  // 1. 決定哪些週次屬於「已發布」：
  // 規則：第 1 週上線就直接顯示（不論日期）；第 2 週及以後需符合今日日期 >= release_date
  const publishedWeeks = allWeeks.filter(w => {
    if (w.week === 1) return true;
    return today >= w.release_date;
  });

  if (publishedWeeks.length === 0) return;

  // 當前選中的週次（預設為最新已發布的週次）
  let targetWeek = publishedWeeks.find(w => w.week === currentActiveWeekNum);
  if (!targetWeek) {
    targetWeek = publishedWeeks[publishedWeeks.length - 1]; // 取最新發布週
    currentActiveWeekNum = targetWeek.week;
  }

  // 渲染頂部當週標題與階段
  const headlineEl = document.getElementById('cur-week-headline');
  const stageEl = document.getElementById('cur-week-stage');
  if (headlineEl) {
    headlineEl.textContent = (targetWeek.week === publishedWeeks[publishedWeeks.length - 1].week)
      ? '本週常見問答'
      : `第 ${targetWeek.week} 週問答回看`;
  }
  if (stageEl) {
    stageEl.textContent = `第 ${targetWeek.week} 週 ｜ ${targetWeek.stage}`;
  }

  // 2. 渲染本週 3 題問答 (大字置頂・細線・無題號)
  const faqListContainer = document.getElementById('faq-list-container');
  if (faqListContainer) {
    let html = '';
    targetWeek.questions.forEach((q, idx) => {
      const cleanTitle = stripNumberPrefix(q.question);
      const answerHtml = formatAnswerHtml(q.answer);

      // 檢查是否有摺疊題（收在主問底下，不獨立出現）
      let foldedHtml = '';
      if (q.folded && q.folded.length > 0) {
        foldedHtml = `
          <div class="faq-folded-wrapper">
            ${q.folded.map(f => `
              <details class="faq-folded-item">
                <summary class="faq-folded-summary">
                  <span>延伸問答：${stripNumberPrefix(f.question)}</span>
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
          <div class="faq-index-kicker">QUESTION 0${idx + 1}</div>
          <h3 class="faq-question-title">${cleanTitle}</h3>
          <div class="faq-answer-body">${answerHtml}</div>
          ${foldedHtml}
        </article>
      `;
    });

    faqListContainer.innerHTML = html;
  }

  // 3. 渲染歷史抽屜清單（已發布的過往週次，排除當前正在看的週次，或列出全部已發布週）
  const historyWeeks = publishedWeeks.filter(w => w.week !== targetWeek.week);
  const drawerSection = document.getElementById('history-drawer-section');
  const historyCountEl = document.getElementById('history-count');
  const historyListContainer = document.getElementById('history-list-container');

  if (historyCountEl) {
    historyCountEl.textContent = historyWeeks.length;
  }

  if (historyListContainer) {
    if (historyWeeks.length === 0) {
      historyListContainer.innerHTML = `
        <p style="font-size: 0.9rem; color: var(--text-muted); padding: 12px 0;">
          目前為第一批發布週次，後續每週四系統將依考程時序自動解鎖發布下一批問答。
        </p>
      `;
    } else {
      let hHtml = '';
      historyWeeks.slice().reverse().forEach(hw => {
        hHtml += `
          <div class="history-week-block">
            <div class="history-week-header">
              第 ${hw.week} 週 ｜ ${hw.stage} (${hw.release_date} 發布)
              <button onclick="selectWeek(${hw.week})" style="margin-left: 10px; background: transparent; border: 1px solid var(--accent); color: var(--accent); font-size: 0.78rem; padding: 2px 8px; border-radius: 2px; cursor: pointer;">
                置頂查看此週
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
  }
}

// 抽屜展開與收起切換
window.toggleHistoryDrawer = function() {
  const panel = document.getElementById('history-drawer-panel');
  const btn = document.getElementById('drawer-toggle-btn');
  if (!panel || !btn) return;

  const isOpen = panel.classList.toggle('is-open');
  btn.textContent = isOpen ? '收起抽屜' : '開啟抽屜';
};

// 抽屜內題目單題展開查看
window.toggleHistoryAnswer = function(el) {
  const ansEl = el.nextElementSibling;
  if (ansEl) {
    const isShowing = ansEl.style.display === 'block';
    ansEl.style.display = isShowing ? 'none' : 'block';
  }
};

// 切換置頂查看某特定週次
window.selectWeek = function(weekNum) {
  currentActiveWeekNum = weekNum;
  renderFaqView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 註冊 Service Worker (更新為學測作戰地圖)
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
