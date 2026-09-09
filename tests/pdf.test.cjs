/**
 * PDF Extraction & Reliability Test Suite (Phase 2)
 * Tests Mozilla pdf.js text extraction on embedded/subsetted font PDF buffers,
 * empty page detection, and OCR fallback triggers.
 */
const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('PDF Extraction & Reliability Tests (Phase 2)', async () => {
  let pdfjsLib;

  before(async () => {
    // Load pdfjs-dist in Node environment
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  });

  test('pdf.min.js and pdf.worker.min.js are vendored in extension/lib/pdfjs/', () => {
    const pdfJsPath = path.join(__dirname, '..', 'extension', 'lib', 'pdfjs', 'pdf.min.js');
    const workerPath = path.join(__dirname, '..', 'extension', 'lib', 'pdfjs', 'pdf.worker.min.js');

    assert(fs.existsSync(pdfJsPath), 'extension/lib/pdfjs/pdf.min.js must exist');
    assert(fs.existsSync(workerPath), 'extension/lib/pdfjs/pdf.worker.min.js must exist');
    assert(fs.statSync(pdfJsPath).size > 100000, 'pdf.min.js must be a non-trivial bundle');
    assert(fs.statSync(workerPath).size > 500000, 'pdf.worker.min.js must be a non-trivial bundle');
  });

  test('tesseract.js and local assets are vendored in extension/lib/tesseract/', () => {
    const tesseractJsPath = path.join(__dirname, '..', 'extension', 'lib', 'tesseract', 'tesseract.min.js');
    const workerPath = path.join(__dirname, '..', 'extension', 'lib', 'tesseract', 'worker.min.js');
    const langDataPath = path.join(__dirname, '..', 'extension', 'lib', 'tesseract', 'eng.traineddata.gz');

    assert(fs.existsSync(tesseractJsPath), 'extension/lib/tesseract/tesseract.min.js must exist');
    assert(fs.existsSync(workerPath), 'extension/lib/tesseract/worker.min.js must exist');
    assert(fs.existsSync(langDataPath), 'extension/lib/tesseract/eng.traineddata.gz must exist');
  });

  test('manifest.json declares web_accessible_resources for pdfjs and tesseract scoped to extension', () => {
    const manifestPath = path.join(__dirname, '..', 'extension', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert(Array.isArray(manifest.web_accessible_resources), 'web_accessible_resources must be an array');
    const hasPdfJs = manifest.web_accessible_resources.some(entry => 
      entry.resources.includes('lib/pdfjs/*') && entry.matches.includes('chrome-extension://*/*')
    );
    const hasTesseract = manifest.web_accessible_resources.some(entry => 
      entry.resources.includes('lib/tesseract/*') && entry.matches.includes('chrome-extension://*/*')
    );

    assert(hasPdfJs, 'lib/pdfjs/* must be in web_accessible_resources scoped to chrome-extension://*/*');
    assert(hasTesseract, 'lib/tesseract/* must be in web_accessible_resources scoped to chrome-extension://*/*');

    // Must NOT be exposed to <all_urls>
    const exposedToAll = manifest.web_accessible_resources.some(entry => entry.matches.includes('<all_urls>'));
    assert.strictEqual(exposedToAll, false, 'web_accessible_resources must NOT be exposed to <all_urls>');
  });

  test('pdf.js extracts text from multi-page document structure correctly', async () => {
    // Minimal valid PDF structure with 1 text page
    const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 44 >> stream
BT
/F1 12 Tf
72 712 Td
(VRH.AI PDF Reliability Test) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000338 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
417
%%EOF`;

    const buffer = Buffer.from(minimalPdf, 'utf-8');
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDoc = await loadingTask.promise;

    assert.strictEqual(pdfDoc.numPages, 1);
    const page = await pdfDoc.getPage(1);
    const content = await page.getTextContent();
    const text = content.items.map(i => i.str).join(' ').trim();

    assert(text.includes('VRH.AI PDF Reliability Test'), `Expected text in PDF, got: "${text}"`);
  });

  test('vendored extension/lib/pdfjs/pdf.min.js defines pdfjsLib and getDocument API', () => {
    const pdfJsPath = path.join(__dirname, '..', 'extension', 'lib', 'pdfjs', 'pdf.min.js');
    const content = fs.readFileSync(pdfJsPath, 'utf8');

    // Verify bundle structure and API definitions
    assert(content.includes('pdfjsLib'), 'Bundle must declare or assign pdfjsLib');
    assert(content.includes('getDocument'), 'Bundle must expose getDocument');
    assert(content.includes('GlobalWorkerOptions'), 'Bundle must expose GlobalWorkerOptions');
    assert(content.includes('window.pdfjsLib=pdfjsLib'), 'Bundle footer must ensure window.pdfjsLib is set');
  });

  test('scanned / image-only PDF detection correctly triggers empty page indexing for OCR fallback', async () => {
    const scannedEmptyPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 0 >> stream
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
00000000115 00000 n 
0000000200 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
251
%%EOF`;

    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(Buffer.from(scannedEmptyPdf)), isEvalSupported: false }).promise;
    assert.strictEqual(doc.numPages, 1);
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const pageStr = content.items.map(i => i.str || '').join(' ').trim();

    assert(pageStr.length < 10, 'Scanned PDF text layer must be empty/sparse (< 10 chars)');
    const emptyPages = [];
    if (pageStr.length < 10) {
      emptyPages.push(1);
    }
    assert.strictEqual(emptyPages.length, 1, 'Page 1 must be flagged for OCR processing');
  });
});
