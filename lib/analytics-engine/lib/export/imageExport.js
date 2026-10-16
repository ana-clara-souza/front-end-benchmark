// lib/export/imageExport.js
//
// AVISO: diferente de dataExport.js, este módulo NÃO tem uma camada pura
// testável em Node — depende do DOM real que o Plotly.js monta (canvas/SVG
// internos), então só pode ser exercitado num browser de verdade. Escrito
// com cuidado, mas precisa de QA manual (ver checklist no fim do arquivo).
//
// PNG: nativo do plotly.js (Plotly.downloadImage) — fidelidade exata.
// PDF: plotly.js NÃO gera PDF sozinho (isso normalmente é feito
// server-side via Orca/Kaleido, fora de escopo aqui). Geramos client-side
// com jsPDF, embutindo uma captura PNG em alta resolução (scale 2-3) —
// ou seja, é um PDF com uma imagem rasterizada dentro, não vetor editável.
// Se precisar de PDF vetorial, seria necessário reintroduzir um serviço
// server-side só para esse export.

import { jsPDF } from "jspdf";

/**
 * Por que existe: o export antes capturava o gráfico do modal forçando 1200x800 (PNG) / 1600x1000 (PDF),
 * independente do layout. Os builders posicionam tudo em px a partir de uma largura (ver
 * plotBuilders/facetGridLayout.js e paretoGrid.js), então forçar outro tamanho esticava/comprimia a figura
 * e os textos voltavam a se sobrepor. Aqui o gráfico é REGERADO na largura do export e desenhado num
 * container fora da tela, com a altura que o próprio builder calculou; a captura usa esse tamanho exato.
 *
 * @param {import('plotly.js-dist-min')} Plotly
 * @param {{data: object[], layout: object}} fig
 * @param {(widthPx:number)=>{data:object[],layout:object}} [rebuild]
 * @param {number} exportWidth
 * @returns {Promise<{gd: HTMLElement, width: number, height: number, dispose: () => void}>}
 */
export async function mountExportFigure(Plotly, fig, rebuild, exportWidth) {
  let f = fig;
  if (rebuild) {
    try {
      const r = rebuild(exportWidth);
      if (r?.data && r?.layout) f = r;
    } catch (err) {
      console.error("rebuild falhou no export; usando a figura atual", err);
    }
  }
  const width = f.layout.width ?? exportWidth; // builder pode ter alargado p/ nada se sobrepor
  const height = f.layout.height ?? Math.round(width * 0.625);

  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;pointer-events:none;`;
  document.body.appendChild(host);
  await Plotly.newPlot(host, f.data, { ...f.layout, autosize: false, width, height }, { staticPlot: true, displayModeBar: false });
  return { gd: host, width, height, dispose: () => { Plotly.purge(host); host.remove(); } };
}

/**
 * @param {object} gd - o DOM node do gráfico Plotly (react-plotly.js v4
 *                       expõe isso diretamente em `plotRef.current`, depois
 *                       que o Plot montou — ver ChartDownloadMenu.jsx)
 * @param {import('plotly.js-dist-min')} Plotly - módulo plotly.js já carregado
 * @param {string} filename - sem extensão
 * @param {{width?: number, height?: number, scale?: number}} [options]
 */
export function exportPNG(gd, Plotly, filename, options = {}) {
  const { width = 1200, height = 800, scale = 2 } = options;
  return Plotly.downloadImage(gd, {
    format: "png",
    filename,
    width,
    height,
    scale,
  });
}

/**
 * Gera um PDF de página única com a imagem do gráfico centralizada,
 * orientação automática (paisagem se for mais largo que alto).
 */
export async function exportPDF(gd, Plotly, filename, options = {}) {
  const { width = 1600, height = 1000, scale = 2 } = options;

  const dataUrl = await Plotly.toImage(gd, { format: "png", width, height, scale });

  const orientation = width >= height ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Encaixa a imagem na página mantendo a proporção original, com margem de 24pt.
  const margin = 24;
  const availableW = pageWidth - margin * 2;
  const availableH = pageHeight - margin * 2;
  const imgRatio = width / height;
  const boxRatio = availableW / availableH;

  let drawW, drawH;
  if (imgRatio > boxRatio) {
    drawW = availableW;
    drawH = availableW / imgRatio;
  } else {
    drawH = availableH;
    drawW = availableH * imgRatio;
  }
  const x = (pageWidth - drawW) / 2;
  const y = (pageHeight - drawH) / 2;

  doc.addImage(dataUrl, "PNG", x, y, drawW, drawH);
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/*
 * CHECKLIST DE QA MANUAL (não coberto por testes automatizados aqui):
 * [ ] PNG baixado abre e mostra o gráfico com legendas/eixos legíveis
 * [ ] PDF baixado tem a imagem centralizada, sem corte nas bordas
 * [ ] Gráficos com múltiplos subplots (chart3/chart4/chart_pareto) exportam
 *     TODOS os subplots, não só o primeiro
 * [ ] scale=2 não deixa o arquivo proibitivamente grande para gráficos com
 *     muitos pontos (chart_pareto com muitos experimentos) — se sim, expor
 *     scale como opção no menu de download em vez de fixo
 */
