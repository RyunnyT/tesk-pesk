/* 진짜 .xlsx 만들기 (JSZip 사용).
   예전에는 HTML 표를 .xls 이름으로 내려받아서 최신 Excel·한셀이 경고를 띄우거나
   '보호된 보기'에서 빈 화면으로 열었다. 시트 여러 개(학생별)도 여기서 만든다. */
(function(root){
'use strict';
const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const MAX_CELL = 32767;
function esc(v){
  return String(v ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/\r\n?/g, '\n')
    .slice(0, MAX_CELL)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function col(i){ let s = ''; i++; while(i > 0){ const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
/* 시트 이름: 31자 이하, []:*?/\ 금지, 중복 금지 */
function sheetNames(names){
  const used = new Set();
  return names.map((raw, i)=>{
    let base = String(raw || '').replace(/[\[\]:*?\/\\]/g, ' ').replace(/^'+|'+$/g, '').trim() || ('시트' + (i + 1));
    base = base.slice(0, 31);
    let name = base, n = 2;
    while(used.has(name.toLowerCase())){ const tail = ' (' + n++ + ')'; name = base.slice(0, 31 - tail.length) + tail; }
    used.add(name.toLowerCase());
    return name;
  });
}
function cell(ref, v, style){
  return '<c r="' + ref + '" t="inlineStr" s="' + style + '"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
}
function sheetXml(sheet){
  const headers = sheet.headers || [];
  const rows = sheet.rows || [];
  const widths = sheet.widths || [];
  const cols = headers.map((_, i)=>'<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (Number(widths[i]) || 14) + '" customWidth="1"/>').join('');
  const out = ['<row r="1">' + headers.map((h, i)=>cell(col(i) + '1', h, 1)).join('') + '</row>'];
  rows.forEach((r, ri)=>{
    const n = ri + 2;
    out.push('<row r="' + n + '">' + (r || []).map((v, i)=>cell(col(i) + n, v, 2)).join('') + '</row>');
  });
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="' + MAIN + '" xmlns:r="' + REL + '">'
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + '<sheetFormatPr defaultRowHeight="15"/>'
    + (cols ? '<cols>' + cols + '</cols>' : '')
    + '<sheetData>' + out.join('') + '</sheetData>'
    + (headers.length && rows.length ? '<autoFilter ref="A1:' + col(headers.length - 1) + (rows.length + 1) + '"/>' : '')
    + '</worksheet>';
}
const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<styleSheet xmlns="' + MAIN + '">'
  + '<fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/><family val="2"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/><family val="2"/></font></fonts>'
  + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
  + '<fill><patternFill patternType="solid"><fgColor rgb="FFEDE9FE"/><bgColor indexed="64"/></patternFill></fill></fills>'
  + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'
  + '<border><left style="thin"><color rgb="FFC8C8C8"/></left><right style="thin"><color rgb="FFC8C8C8"/></right><top style="thin"><color rgb="FFC8C8C8"/></top><bottom style="thin"><color rgb="FFC8C8C8"/></bottom><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
  + '<xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
  + '</styleSheet>';
/* sheets: [{name, headers:[...], rows:[[...]], widths:[...]}] → zip 파일 하나 */
function fill(zip, sheets){
  if(!Array.isArray(sheets) || !sheets.length) throw new Error('XLSX_NO_SHEETS');
  const names = sheetNames(sheets.map(s=>s.name));
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + names.map((_, i)=>'<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')
    + '</Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="' + REL + '/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<workbook xmlns="' + MAIN + '" xmlns:r="' + REL + '"><sheets>'
    + names.map((n, i)=>'<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('')
    + '</sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + names.map((_, i)=>'<Relationship Id="rId' + (i + 1) + '" Type="' + REL + '/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('')
    + '<Relationship Id="rId' + (names.length + 1) + '" Type="' + REL + '/styles" Target="styles.xml"/></Relationships>');
  zip.file('xl/styles.xml', STYLES);
  sheets.forEach((s, i)=>zip.file('xl/worksheets/sheet' + (i + 1) + '.xml', sheetXml(s)));
  return zip;
}
async function build(sheets, JSZipCtor){
  const Z = JSZipCtor || root.JSZip;
  if(!Z) throw new Error('엑셀 모듈(JSZip)을 불러오지 못했어요. 새로고침해주세요.');
  return fill(new Z(), sheets).generateAsync({type:'blob', compression:'DEFLATE',
    mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
const API = {build, fill, sheetNames, sheetXml, col};
if(typeof module === 'object' && module.exports) module.exports = API;
root.TeskXlsx = API;
})(typeof window !== 'undefined' ? window : globalThis);
