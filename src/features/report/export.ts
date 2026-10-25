import html2canvas from 'html2canvas';
import type { AIAnalysisReport } from '../../types';

/** 从 document.styleSheets 汇总全部 CSS 文本（同源样式表） */
function collectCssText(): string {
  let cssText = '';
  const styleSheets = Array.from(document.styleSheets || []);
  for (const sheet of styleSheets) {
    try {
      const rules = (sheet as CSSStyleSheet).cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        cssText += `${rule.cssText}\n`;
      }
    } catch {
      // 忽略跨域样式表
    }
  }
  return cssText;
}

function buildExportHtml(cssText: string, innerHTML: string, data: AIAnalysisReport): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1400, initial-scale=1.0" />
    <title>${data.stockName} (${data.stockCode}) - AI 深度分析报告</title>
    <style>
      ${cssText}
      html, body { height: auto; }
      body { margin: 0; padding: 24px; background: #f6f8fb; }
    </style>
  </head>
  <body>
    <div id="export-root" style="width: 1400px;">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${innerHTML}
      </div>
    </div>
  </body>
</html>`;
}

/** 导出报告 HTML 归档 */
export function exportReportHTML(root: HTMLElement, data: AIAnalysisReport): void {
  const cloned = root.cloneNode(true) as HTMLElement;
  cloned.querySelectorAll('[data-html2canvas-ignore]').forEach((el) => el.remove());
  const htmlContent = buildExportHtml(collectCssText(), cloned.outerHTML, data);

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.stockName}_Analysis_${data.timestamp.replace(/[/ :]/g, '')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** 计算元素的真实渲染高度（含绝对定位子元素） */
function computeRealHeight(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  let maxBottom = 0;
  const walkDOM = (node: Element, parentTop: number) => {
    const nodeRect = (node as HTMLElement).getBoundingClientRect();
    const bottom = nodeRect.bottom - parentTop;
    if (bottom > maxBottom) maxBottom = bottom;
    Array.from(node.children).forEach((child) => walkDOM(child, parentTop));
  };
  walkDOM(el, rect.top);
  return Math.max(el.scrollHeight, el.offsetHeight, maxBottom);
}

/** 导出报告为长图（分块渲染避免画布尺寸上限） */
export async function exportReportImage(root: HTMLElement, data: AIAnalysisReport): Promise<void> {
  const cloned = root.cloneNode(true) as HTMLElement;
  cloned.querySelectorAll('[data-html2canvas-ignore]').forEach((el) => el.remove());

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-100000px;top:0;width:1400px;height:800px;border:0;opacity:0;pointer-events:none;';
  iframe.srcdoc = buildExportHtml(collectCssText(), cloned.outerHTML, data);
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Export iframe load timeout')), 8000);
      iframe.onload = () => {
        window.clearTimeout(timer);
        resolve();
      };
    });

    const doc = iframe.contentDocument;
    if (!doc) throw new Error('Export iframe document not available');

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const target = doc.body as unknown as HTMLElement;
    const fullWidth = 1400;
    const fullHeight = Math.ceil(computeRealHeight(target));
    (doc.documentElement as HTMLElement).style.height = `${fullHeight}px`;
    (doc.body as HTMLElement).style.height = `${fullHeight}px`;
    (doc.body as HTMLElement).style.overflow = 'visible';

    const MAX_CANVAS_DIM = 16384;
    const safeScale = Math.min(2, MAX_CANVAS_DIM / Math.max(1, fullWidth), MAX_CANVAS_DIM / Math.max(1, fullHeight));
    const scale = Math.max(0.5, safeScale);
    const maxTileHeight = Math.max(512, Math.floor(MAX_CANVAS_DIM / scale) - 20);

    const tiles: HTMLCanvasElement[] = [];
    for (let y = 0; y < fullHeight; y += maxTileHeight) {
      const tileHeight = Math.min(maxTileHeight, fullHeight - y);
      // eslint-disable-next-line no-await-in-loop
      const tileCanvas = await html2canvas(target, {
        scale,
        useCORS: true,
        backgroundColor: '#F6F8FB',
        logging: false,
        width: fullWidth,
        height: tileHeight,
        windowWidth: fullWidth,
        windowHeight: tileHeight,
        scrollX: 0,
        scrollY: 0,
        allowTaint: true,
        x: 0,
        y,
      } as any);
      tiles.push(tileCanvas);
    }

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = Math.round(fullWidth * scale);
    finalCanvas.height = Math.round(fullHeight * scale);
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');
    let drawY = 0;
    for (const tile of tiles) {
      ctx.drawImage(tile, 0, drawY);
      drawY += tile.height;
    }

    const link = document.createElement('a');
    link.download = `${data.stockName}_Analysis_${data.timestamp.replace(/[/ :]/g, '')}.png`;
    link.href = finalCanvas.toDataURL('image/png');
    link.click();
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}
