def render_extras():
    return """
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
"""
if __name__ == '__main__':
    print(render_extras())
