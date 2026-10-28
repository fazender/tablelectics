/**
 * Tablelectics — script.js
 * Quiz Grade Recap Completeness Validator
 *
 * All data is processed entirely in the browser.
 * No data is sent to any server.
 */

/* ============================================================
   SAMPLE DATA
   Contains intentional errors for demo purposes:
   - Empty cells (missing grades)
   - Grade of 0 (valid but notable)
   - Duplicate NRP
   - Invalid NRP format (not exactly 10 digits)
   ============================================================ */
const SAMPLE_DATA = `NRP\tTugas 1\tKuis 1\tTugas 2\tKuis 2
5025261001\t85\t90\t78\t88
5025261002\t70\t\t65\t72
5025261003\t95\t100\t0\t91
5025261004\t\t60\t80\t
5025261001\t88\t77\t82\t79
502526100X\t75\t80\t70\t85
50252610\t90\t95\t88\t92
5025261008\t-5\t110\t50\t60
5025261009\t80\t75\t\t
5025261010\t100\t0\t100\t100`;

/* ============================================================
   VALIDATION CONSTANTS
   ============================================================ */
/** NRP must be exactly 10 digits (numeric characters only). */
const NRP_REGEX = /^\d{10}$/;

/** Valid grade range */
const GRADE_MIN = 0;
const GRADE_MAX = 100;

/* ============================================================
   DOM REFERENCES
   ============================================================ */
const pasteArea      = document.getElementById('paste-area');
const fileInput      = document.getElementById('file-input');
const fileNameLabel  = document.getElementById('file-name');
const btnCheck       = document.getElementById('btn-check');
const btnSample      = document.getElementById('btn-sample');
const btnClear       = document.getElementById('btn-clear');

const legendSection  = document.getElementById('legend-section');
const resultsSection = document.getElementById('results-section');
const reportSection  = document.getElementById('report-section');
const resultsThead   = document.getElementById('results-thead');
const resultsTbody   = document.getElementById('results-tbody');
const reportContent  = document.getElementById('report-content');
const footerYear     = document.getElementById('footer-year');

/* ============================================================
   INIT
   ============================================================ */
footerYear.textContent = new Date().getFullYear();

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

/** Load sample data into the textarea. */
btnSample.addEventListener('click', () => {
  pasteArea.value = SAMPLE_DATA;
  clearFileInput();
  hideResults();
});

/** Clear all inputs and results. */
btnClear.addEventListener('click', () => {
  pasteArea.value = '';
  clearFileInput();
  hideResults();
});

/** When a CSV file is selected, read it into the textarea. */
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;

  fileNameLabel.textContent = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    // Convert CSV to tab-separated so parseData() handles one format.
    const csvText = e.target.result;
    pasteArea.value = convertCsvToTsv(csvText);
  };
  reader.readAsText(file, 'UTF-8');
});

/** Run validation when Check is clicked. */
btnCheck.addEventListener('click', () => {
  const rawText = pasteArea.value.trim();
  if (!rawText) {
    alert('Silakan tempel data atau unggah file CSV terlebih dahulu.');
    return;
  }
  runValidation(rawText);
});

/* ============================================================
   DATA PARSING
   ============================================================ */

/**
 * Convert a CSV string to a tab-separated string.
 * Handles quoted fields (RFC 4180 subset).
 *
 * @param {string} csv - Raw CSV text.
 * @returns {string} Tab-separated text.
 */
function convertCsvToTsv(csv) {
  return csv
    .split(/\r?\n/)
    .map(line => parseCsvLine(line).join('\t'))
    .join('\n');
}

/**
 * Parse a single CSV line, respecting double-quoted fields.
 *
 * @param {string} line - One CSV row.
 * @returns {string[]} Array of cell values.
 */
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Peek next char for escaped quote ""
        if (line[i + 1] === '"') {
          current += '"';
          i++; // skip second quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parse raw tab-separated text into a 2-D array.
 * The first row is treated as headers.
 *
 * @param {string} text - Tab-separated text.
 * @returns {{ headers: string[], rows: string[][] }}
 */
function parseData(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');

  const headers = lines[0].split('\t').map(h => h.trim());

  const rows = lines.slice(1).map(line =>
    line.split('\t').map(cell => cell.trim())
  );

  return { headers, rows };
}

/* ============================================================
   VALIDATION
   ============================================================ */

/**
 * Issue types — used as CSS class suffixes and report keys.
 * @enum {string}
 */
const Issue = {
  EMPTY:     'empty',
  INVALID:   'invalid',
  DUPLICATE: 'duplicate',
  BAD_NRP:   'bad-nrp',
};

/**
 * Parse a grade string to a number.
 * Accepts both dot and comma as the decimal separator so that
 * Indonesian spreadsheet values like "82,5" are treated as 82.5.
 *
 * @param {string} value - Raw cell string.
 * @returns {number} Parsed number, or NaN if the value is not numeric.
 */
function parseGrade(value) {
  // Replace the first comma used as a decimal separator with a dot.
  // Only replace when the pattern looks like a decimal number
  // (digits, optional sign, then comma, then digits) to avoid
  // treating a plain comma as a decimal point in other contexts.
  const normalised = value.replace(/^([+-]?\d+),(\d+)$/, '$1.$2');
  return Number(normalised);
}

/**
 * Run all validation checks on the parsed data.
 *
 * @param {string} rawText - Raw input text from textarea.
 */
function runValidation(rawText) {
  const { headers, rows } = parseData(rawText);

  if (headers.length < 2) {
    alert('Data harus memiliki minimal dua kolom: NRP dan satu kolom nilai.');
    return;
  }

  // --- Pass 1: collect all NRPs to find duplicates ---
  const nrpCount = {}; // { nrpValue: count }
  rows.forEach(row => {
    const nrp = row[0] ?? '';
    nrpCount[nrp] = (nrpCount[nrp] ?? 0) + 1;
  });

  /**
   * cellIssues[rowIndex][colIndex] = Set of Issue strings for that cell.
   * @type {Set<string>[][]}
   */
  const cellIssues = rows.map(() => headers.map(() => new Set()));

  // --- Pass 2: validate each cell ---
  rows.forEach((row, rowIdx) => {
    headers.forEach((header, colIdx) => {
      const rawCell = row[colIdx];              // may be undefined if row is shorter
      const value   = rawCell !== undefined ? rawCell : '';

      if (colIdx === 0) {
        // ---- NRP column ----
        if (value === '') {
          cellIssues[rowIdx][colIdx].add(Issue.EMPTY);
        } else {
          if (!NRP_REGEX.test(value)) {
            cellIssues[rowIdx][colIdx].add(Issue.BAD_NRP);
          }
          if (nrpCount[value] > 1) {
            cellIssues[rowIdx][colIdx].add(Issue.DUPLICATE);
          }
        }
      } else {
        // ---- Grade column ----
        if (value === '') {
          cellIssues[rowIdx][colIdx].add(Issue.EMPTY);
        } else {
          // Indonesian spreadsheets use commas as decimal separators (e.g. "82,5").
          // Normalise to a dot before parsing so "82,5" is treated as 82.5.
          const num = parseGrade(value);
          if (Number.isNaN(num) || num < GRADE_MIN || num > GRADE_MAX) {
            cellIssues[rowIdx][colIdx].add(Issue.INVALID);
          }
          // A grade of 0 is valid — no flag added.
        }
      }
    });
  });

  // --- Render results ---
  renderTable(headers, rows, cellIssues);
  renderReport(headers, rows, cellIssues);
  showResults();
}

/* ============================================================
   RENDERING — TABLE
   ============================================================ */

/**
 * Build and display the highlighted results table.
 *
 * @param {string[]}      headers    - Column headers.
 * @param {string[][]}    rows       - Data rows.
 * @param {Set<string>[][]} cellIssues - Issues per cell.
 */
function renderTable(headers, rows, cellIssues) {
  // ---- Build header row ----
  const tr = document.createElement('tr');

  // Row number column header (decorative)
  const thNum = document.createElement('th');
  thNum.textContent = '#';
  thNum.setAttribute('aria-label', 'Row number');
  tr.appendChild(thNum);

  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    tr.appendChild(th);
  });

  resultsThead.innerHTML = '';
  resultsThead.appendChild(tr);

  // ---- Build data rows ----
  resultsTbody.innerHTML = '';

  rows.forEach((row, rowIdx) => {
    const tr = document.createElement('tr');

    // Row number cell
    const tdNum = document.createElement('td');
    tdNum.textContent = rowIdx + 1;
    tdNum.className = 'col-row-num';
    tr.appendChild(tdNum);

    headers.forEach((_, colIdx) => {
      const td    = document.createElement('td');
      const value = row[colIdx] !== undefined ? row[colIdx] : '';
      const issues = cellIssues[rowIdx][colIdx];

      if (issues.has(Issue.EMPTY)) {
        // Show a distinguishable placeholder so empty ≠ zero
        td.textContent = '(kosong)';
        td.classList.add('cell-empty');
        td.setAttribute('aria-label', `Sel kosong pada kolom ${headers[colIdx]}`);
      } else {
        td.textContent = value;
        // Apply CSS classes for each issue type
        if (issues.has(Issue.BAD_NRP))   td.classList.add('cell-bad-nrp');
        if (issues.has(Issue.DUPLICATE)) td.classList.add('cell-duplicate');
        if (issues.has(Issue.INVALID))   td.classList.add('cell-invalid');
      }

      tr.appendChild(td);
    });

    resultsTbody.appendChild(tr);
  });
}

/* ============================================================
   RENDERING — COLUMN REPORT
   ============================================================ */

/**
 * Build and display per-column issue summaries.
 *
 * @param {string[]}      headers    - Column headers.
 * @param {string[][]}    rows       - Data rows.
 * @param {Set<string>[][]} cellIssues - Issues per cell.
 */
function renderReport(headers, rows, cellIssues) {
  reportContent.innerHTML = '';

  let totalIssues = 0;

  headers.forEach((header, colIdx) => {
    const isNrpCol = colIdx === 0;

    /** Rows that have at least one issue in this column. */
    const problemRows = rows.reduce((acc, row, rowIdx) => {
      if (cellIssues[rowIdx][colIdx].size > 0) {
        acc.push({ rowIdx, row, issues: cellIssues[rowIdx][colIdx] });
      }
      return acc;
    }, []);

    if (problemRows.length === 0) {
      // Column is clean
      const item = createReportItem(
        `<strong>${escapeHtml(header)}</strong>: ✓ No issues found.`,
        'ok'
      );
      reportContent.appendChild(item);
      return;
    }

    totalIssues += problemRows.length;

    // Group by issue type for a clear per-column narrative
    const byIssue = {};
    problemRows.forEach(({ row, issues }) => {
      issues.forEach(issueType => {
        if (!byIssue[issueType]) byIssue[issueType] = [];
        byIssue[issueType].push(row[0] || '(empty NRP)');
      });
    });

    const lines = [];

    if (byIssue[Issue.EMPTY]) {
      const count = byIssue[Issue.EMPTY].length;
      const nrps  = formatNrpList(byIssue[Issue.EMPTY]);
      if (isNrpCol) {
        lines.push(`${count} baris memiliki <strong>NRP kosong</strong>.`);
      } else {
        lines.push(
          `${count} mahasiswa tidak memiliki nilai <strong>${escapeHtml(header)}</strong>: ` +
          nrps
        );
      }
    }

    if (byIssue[Issue.INVALID]) {
      const count = byIssue[Issue.INVALID].length;
      const nrps  = formatNrpList(byIssue[Issue.INVALID]);
      lines.push(
        `${count} mahasiswa memiliki nilai <strong>${escapeHtml(header)}</strong> yang tidak valid ` +
        `(bukan angka atau di luar rentang 0–100): ` +
        nrps
      );
    }

    if (byIssue[Issue.BAD_NRP]) {
      const count = byIssue[Issue.BAD_NRP].length;
      const vals  = formatNrpList(byIssue[Issue.BAD_NRP]);
      lines.push(
        `${count} baris memiliki <strong>format NRP tidak valid</strong> (harus tepat 10 digit): ` +
        vals
      );
    }

    if (byIssue[Issue.DUPLICATE]) {
      const unique = [...new Set(byIssue[Issue.DUPLICATE])];
      const nrps   = formatNrpList(unique);
      lines.push(
        `${unique.length} NRP muncul <strong>lebih dari satu kali</strong>: ` +
        nrps
      );
    }

    const html = `<strong>${escapeHtml(header)}</strong>: ` + lines.join(' &nbsp;|&nbsp; ');
    reportContent.appendChild(createReportItem(html, 'warn'));
  });

  // If absolutely no issues anywhere, show a congratulatory banner
  if (totalIssues === 0) {
    reportContent.innerHTML = '';
    const banner = document.createElement('div');
    banner.className = 'report-all-ok';
    banner.textContent = '✓ Rekap nilai sudah lengkap — tidak ada masalah ditemukan di semua kolom.';
    reportContent.appendChild(banner);
  }
}

/**
 * Create a styled report item element.
 *
 * @param {string} htmlContent - Inner HTML for the item.
 * @param {'ok'|'warn'} type   - Visual style.
 * @returns {HTMLElement}
 */
function createReportItem(htmlContent, type) {
  const div = document.createElement('div');
  div.className = `report-item report-${type}`;
  div.innerHTML = htmlContent;
  return div;
}

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Escape a string for safe HTML insertion.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert an array of NRP strings into an HTML fragment where each NRP is
 * wrapped in a <span class="nrp-token"> so it is never broken across lines.
 * Individual tokens are separated by a comma + non-breaking space.
 *
 * @param {string[]} nrps - Array of NRP (or value) strings.
 * @returns {string} Safe HTML string.
 */
function formatNrpList(nrps) {
  return nrps
    .map(nrp => `<span class="nrp-token">${escapeHtml(nrp)}</span>`)
    .join(',&#8203; '); // comma + zero-width space lets the gap wrap, not the token
}

/** Reset file input and its label. */
function clearFileInput() {
  fileInput.value = '';
  fileNameLabel.textContent = 'Belum ada file dipilih';
}

/** Show legend, results table, and report sections. */
function showResults() {
  legendSection.classList.remove('hidden');
  resultsSection.classList.remove('hidden');
  reportSection.classList.remove('hidden');
  // Smooth scroll to the legend
  legendSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Hide legend, results table, and report sections. */
function hideResults() {
  legendSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
  reportSection.classList.add('hidden');
}
