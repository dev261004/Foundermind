"use client";

const PDF_PAGE_WIDTH_MM = 210;
const PDF_PAGE_HEIGHT_MM = 297;
const PDF_FOOTER_MARGIN_MM = 16;
const PDF_CONTENT_HEIGHT_MM = PDF_PAGE_HEIGHT_MM - PDF_FOOTER_MARGIN_MM;
const PDF_CONTENT_PAGE_OFFSET = 1; // Cover page is intentionally left unnumbered.

export const ANALYSIS_PDF_ELEMENT_ID = "analysis-pdf-template";

type RawPageMap = Record<string, number>;

type TocOverlay = {
  sourcePage: number;
  targetPage: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PageMetrics = {
  containerRect: DOMRect;
  pxPerMm: number;
  pageHeightPx: number;
};

type PageMapResult = {
  sectionPages: RawPageMap;
  blockPages: RawPageMap;
};

// Tracks sections that span more than one PDF page so we can inject
// a continuation header on pages 2, 3, … of that section.
type SectionSpan = {
  title: string;
  startPage: number;
  endPage: number;
};

type TextOptions = {
  align?: "left" | "center" | "right";
};

type PdfDocumentLike = {
  internal: {
    getNumberOfPages: () => number;
  };
  setPage: (pageNumber: number) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setFillColor: (r: number, g: number, b: number) => void;
  setLineWidth: (width: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  rect: (x: number, y: number, width: number, height: number, style: string) => void;
  setFont: (fontName: string, fontStyle: string) => void;
  setFontSize: (fontSize: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  text: (text: string, x: number, y: number, options?: TextOptions) => void;
  link: (
    x: number,
    y: number,
    width: number,
    height: number,
    options: { pageNumber: number; magFactor: "Fit" },
  ) => void;
  save: (filename: string) => void;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDateSlug(date: Date) {
  return date.toISOString().slice(0, 10);
}

function waitForLayout() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function getPageMetrics(root: HTMLElement): PageMetrics {
  const containerRect = root.getBoundingClientRect();
  const pxPerMm = containerRect.width / PDF_PAGE_WIDTH_MM;
  const pageHeightPx = pxPerMm * PDF_CONTENT_HEIGHT_MM;

  return {
    containerRect,
    pxPerMm,
    pageHeightPx,
  };
}

function pxToMm(value: number, pxPerMm: number) {
  return value / pxPerMm;
}

function collectRawPageMap(root: HTMLElement, metrics: PageMetrics): PageMapResult {
  const sectionPages: RawPageMap = {};
  const blockPages: RawPageMap = {};
  let currentPage = 1;

  root.querySelectorAll<HTMLElement>("[data-pdf-block]").forEach((block) => {
    const blockId = block.dataset.pdfBlock;
    if (!blockId) {
      return;
    }

    blockPages[blockId] = currentPage;

    const sectionId = block.dataset.pdfSection;
    if (sectionId) {
      sectionPages[sectionId] = currentPage;
    }

    const blockHeightPx = block.getBoundingClientRect().height;
    const consumedPages = Math.max(1, Math.ceil(blockHeightPx / metrics.pageHeightPx));
    currentPage += consumedPages;
  });

  return { sectionPages, blockPages };
}

function toDisplayPage(rawPage: number) {
  return Math.max(1, rawPage - PDF_CONTENT_PAGE_OFFSET);
}

function injectTocPageNumbers(root: HTMLElement, rawPageMap: RawPageMap) {
  root.querySelectorAll<HTMLElement>("[data-page-for]").forEach((node) => {
    const sectionId = node.dataset.pageFor;
    if (!sectionId) {
      return;
    }

    const rawPage = rawPageMap[sectionId];
    node.textContent = rawPage ? String(toDisplayPage(rawPage)) : "";
  });
}

function collectTocOverlays(
  root: HTMLElement,
  metrics: PageMetrics,
  pageMap: PageMapResult,
): TocOverlay[] {
  const overlays: TocOverlay[] = [];
  const tocBlock = root.querySelector<HTMLElement>("[data-pdf-block='toc']");
  if (!tocBlock) {
    return overlays;
  }

  const tocBlockRect = tocBlock.getBoundingClientRect();
  const tocStartPage = pageMap.blockPages.toc ?? 1;

  root.querySelectorAll<HTMLElement>("[data-toc-target]").forEach((node) => {
    const targetId = node.dataset.tocTarget;
    if (!targetId) {
      return;
    }

    const targetPage = pageMap.sectionPages[targetId];
    if (!targetPage) {
      return;
    }

    const clientRects = node.getClientRects();
    for (const rect of Array.from(clientRects)) {
      const topPx = rect.top - tocBlockRect.top;
      const leftPx = rect.left - tocBlockRect.left;
      const sourcePage = tocStartPage + Math.floor(topPx / metrics.pageHeightPx);

      overlays.push({
        sourcePage,
        targetPage,
        x: pxToMm(leftPx, metrics.pxPerMm),
        y: pxToMm(topPx % metrics.pageHeightPx, metrics.pxPerMm),
        width: pxToMm(rect.width, metrics.pxPerMm),
        height: pxToMm(rect.height, metrics.pxPerMm),
      });
    }
  });

  return overlays;
}

/**
 * Walk every [data-pdf-section] element in the rendered template and compute
 * how many PDF pages it occupies.  Sections that span more than one page are
 * returned so we can stamp a continuation header on pages 2, 3, … of that
 * section via jsPDF after html2pdf has finished rendering.
 */
function collectSectionSpans(
  root: HTMLElement,
  metrics: PageMetrics,
  pageMap: PageMapResult,
): SectionSpan[] {
  const spans: SectionSpan[] = [];

  root.querySelectorAll<HTMLElement>("[data-pdf-section]").forEach((section) => {
    const sectionId = section.dataset.pdfSection;
    if (!sectionId) {
      return;
    }

    const startPage = pageMap.sectionPages[sectionId];
    if (!startPage) {
      return;
    }

    const blockHeightPx = section.getBoundingClientRect().height;
    const pagesConsumed = Math.max(1, Math.ceil(blockHeightPx / metrics.pageHeightPx));
    const endPage = startPage + pagesConsumed - 1;

    // Single-page sections need no continuation header.
    if (endPage <= startPage) {
      return;
    }

    // Pull the section <h2> text that was rendered in the DOM.
    const titleEl = section.querySelector("h2");
    const title = titleEl?.textContent?.trim() ?? sectionId;

    spans.push({ title, startPage, endPage });
  });

  return spans;
}

function buildExportMarkup(root: HTMLElement) {
  return `<div style="background-color: #ffffff; width: 210mm; margin: 0 auto; overflow: hidden;">
    ${root.innerHTML}
  </div>`;
}

function addPdfFooter(pdf: PdfDocumentLike) {
  const totalPages = pdf.internal.getNumberOfPages();

  for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
    pdf.setPage(pageNumber);

    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.35);
    pdf.line(12, 287, 198, 287);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text("FOUNDERMIND", 12, 292);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Page ${pageNumber - PDF_CONTENT_PAGE_OFFSET}`, 198, 292, {
      align: "right",
    });
  }
}

/**
 * For every section that overflows onto multiple PDF pages, stamp a slim
 * continuation header at the very top of each overflow page.
 *
 * Strategy:
 *  1. Paint a white rectangle over the top 26 mm to hide any html2canvas
 *     content that bleeds upward from the previous page (html2pdf does not
 *     add top-of-page padding on continuation pages).
 *  2. Draw a gold accent rule, the section title, and a "continued" label.
 *  3. Close with a light separator rule so content below reads cleanly.
 *
 * This mirrors the addPdfFooter approach so both post-processing passes stay
 * consistent in style and execution order.
 */
function addSectionContinuationHeaders(pdf: PdfDocumentLike, spans: SectionSpan[]) {
  spans.forEach(({ title, startPage, endPage }) => {
    for (let page = startPage + 1; page <= endPage; page++) {
      pdf.setPage(page);

      // ── 1. White mask ────────────────────────────────────────────────────
      // Cover any content that bleeds into the top margin area.
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, PDF_PAGE_WIDTH_MM, 28, "F");

      // ── 2. Top gold accent rule ──────────────────────────────────────────
      pdf.setDrawColor(138, 103, 53); // #8a6735 — matches brand gold
      pdf.setLineWidth(0.7);
      pdf.line(12, 9, 198, 9);

      // ── 3. Section title ─────────────────────────────────────────────────
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(24, 34, 53); // #182235 — matches titleStyle
      pdf.text(title, 12, 17);

      // ── 4. "continued" label (right-aligned, muted gold) ────────────────
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(138, 103, 53);
      pdf.text("continued", 198, 17, { align: "right" });

      // ── 5. Bottom separator rule ─────────────────────────────────────────
      pdf.setDrawColor(215, 196, 162); // matches sectionDividerStyle
      pdf.setLineWidth(0.35);
      pdf.line(12, 23, 198, 23);
    }
  });
}

function addInternalTocLinks(pdf: PdfDocumentLike, overlays: TocOverlay[]) {
  overlays.forEach((overlay) => {
    pdf.setPage(overlay.sourcePage);
    pdf.link(overlay.x, overlay.y, overlay.width, overlay.height, {
      pageNumber: overlay.targetPage,
      magFactor: "Fit",
    });
  });
}

export async function downloadAnalysisPdf(
  elementId: string,
  ideaName: string,
  onSuccess?: () => void,
) {
  const root = document.getElementById(elementId);
  if (!root) {
    throw new Error("PDF template is not available.");
  }

  const safeSlug = slugify(ideaName) || "startup-idea";
  const filename = `foundermind-analysis-${safeSlug}-${formatDateSlug(new Date())}.pdf`;
  const html2pdf = (await import("html2pdf.js")).default;

  await waitForLayout();

  const initialMetrics = getPageMetrics(root);
  const initialPageMap = collectRawPageMap(root, initialMetrics);
  injectTocPageNumbers(root, initialPageMap.sectionPages);

  await waitForLayout();

  const finalMetrics = getPageMetrics(root);
  const rawPageMap = collectRawPageMap(root, finalMetrics);
  injectTocPageNumbers(root, rawPageMap.sectionPages);
  const tocOverlays = collectTocOverlays(root, finalMetrics, rawPageMap);

  // Collect multi-page section spans AFTER final layout is stable so the
  // DOM measurements match what html2pdf will actually render.
  const sectionSpans = collectSectionSpans(root, finalMetrics, rawPageMap);

  const htmlMarkup = buildExportMarkup(root);

  await html2pdf()
    .set({
      margin: [0, 0, PDF_FOOTER_MARGIN_MM, 0],
      filename,
      enableLinks: true,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollY: 0,
        windowY: 0,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
      pagebreak: {
        mode: [],
        before: "[data-pdf-page-start='true']",
        avoid: ["[data-pdf-keep-together='true']", "tr", "thead", "tbody"],
      },
    } as Record<string, unknown>)
    .from(htmlMarkup)
    .toPdf()
    .get("pdf")
    .then((pdf: unknown) => {
      const pdfDocument = pdf as PdfDocumentLike;

      // Order matters:
      //  1. Continuation headers first — they paint a white mask + title text.
      //  2. TOC links — invisible overlays, unaffected by draw order.
      //  3. Footer last — draws at y≈287-292, well below our y≈9-23 headers.
      addSectionContinuationHeaders(pdfDocument, sectionSpans);
      addInternalTocLinks(pdfDocument, tocOverlays);
      addPdfFooter(pdfDocument);
      pdfDocument.save(filename);
    });

  onSuccess?.();
}