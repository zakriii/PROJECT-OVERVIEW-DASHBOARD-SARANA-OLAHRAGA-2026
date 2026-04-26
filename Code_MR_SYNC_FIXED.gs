/**
 * PROJECT OVERVIEW — Google Drive Gateway v1.2
 * - ping / health check
 * - upload_excel: upload Excel/CSV files to Drive folder MR BACKUP
 * - saveRows: sync website module rows into a Google Sheet in MR BACKUP
 */
const CONFIG = {
  FOLDER_NAME: 'MR BACKUP',
  MAX_FILE_MB: 20,
  ALLOWED_EXT: ['xlsx','xls','csv','json'],
};

function doGet(e) {
  return jsonOut({ ok: true, app: 'Project Overview Drive Gateway', service: 'drive-gateway', version: '1.2.0' });
}

function doPost(e) {
  try {
    const payload = parseJsonBody_(e);
    const token = String((payload && payload.token) ? payload.token : '');
    assertToken_(token);
    const action = String(payload.action || 'ping');
    if (action === 'ping') return jsonOut({ ok: true, message: 'pong', version: '1.2.0' });
    if (action === 'upload_excel') return handleUploadExcel_(payload);
    if (action === 'saveRows') return handleSaveRows_(payload);
    return jsonOut({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function handleUploadExcel_(payload) {
  const filename = String(payload.filename || 'upload.xlsx');
  const mimeType = String(payload.mimeType || 'application/octet-stream');
  const base64 = String(payload.base64 || '');
  const subfolder = String(payload.subfolder || '');
  if (!base64) throw new Error('base64 is required');
  validateFileName_(filename);
  validateSize_(base64);
  const folder = getOrCreateTargetFolder_(CONFIG.FOLDER_NAME, subfolder);
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, filename);
  const file = folder.createFile(blob);
  file.setDescription('Uploaded via Project Overview Web App');
  const fileId = file.getId();
  return jsonOut({ ok: true, fileId: fileId, fileUrl: 'https://drive.google.com/file/d/' + fileId + '/view', name: file.getName() });
}

function handleSaveRows_(payload) {
  const moduleName = sanitizeName_(String(payload.module || 'module'));
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const folder = getOrCreateTargetFolder_(CONFIG.FOLDER_NAME, 'sync');
  const sheetName = 'POV_SYNC_' + moduleName;
  const ss = getOrCreateSpreadsheetInFolder_(folder, sheetName);
  const sh = ss.getSheets()[0];
  sh.setName('Data');
  sh.clearContents();
  const headers = collectHeaders_(rows);
  if (headers.length) {
    const values = [headers].concat(rows.map(function(row){
      return headers.map(function(h){
        const v = row && row[h] !== undefined && row[h] !== null ? row[h] : '';
        return typeof v === 'object' ? JSON.stringify(v) : v;
      });
    }));
    sh.getRange(1,1,values.length,headers.length).setValues(values);
    sh.setFrozenRows(1);
  }
  const meta = ss.getSheetByName('_meta') || ss.insertSheet('_meta');
  meta.clearContents();
  meta.getRange(1,1,5,2).setValues([
    ['module', moduleName],
    ['rows', rows.length],
    ['updated_at', new Date()],
    ['source', 'Project Overview Web App'],
    ['version', '1.2.0']
  ]);
  return jsonOut({ ok: true, module: moduleName, rows: rows.length, spreadsheetId: ss.getId(), spreadsheetUrl: ss.getUrl() });
}

function getOrCreateSpreadsheetInFolder_(folder, name) {
  const files = folder.getFilesByName(name);
  while (files.hasNext()) {
    const f = files.next();
    if (f.getMimeType() === MimeType.GOOGLE_SHEETS) return SpreadsheetApp.openById(f.getId());
  }
  const ss = SpreadsheetApp.create(name);
  const file = DriveApp.getFileById(ss.getId());
  file.moveTo(folder);
  return ss;
}

function collectHeaders_(rows) {
  const seen = {};
  const headers = [];
  rows.forEach(function(row){
    if (!row) return;
    Object.keys(row).forEach(function(k){ if (!seen[k]) { seen[k] = true; headers.push(k); } });
  });
  return headers;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function parseJsonBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try { return JSON.parse(e.postData.contents); } catch (_) { return {}; }
}
function assertToken_(token) {
  const expected = String(PropertiesService.getScriptProperties().getProperty('API_TOKEN') || '');
  if (!expected) throw new Error('API_TOKEN not set in Script Properties');
  if (!token) throw new Error('token missing');
  if (token !== expected) throw new Error('invalid token');
}
function validateFileName_(filename) {
  const ext = String(filename || '').split('.').pop().toLowerCase();
  if (!ext) throw new Error('file extension required');
  if (CONFIG.ALLOWED_EXT.indexOf(ext) < 0) throw new Error('extension not allowed: ' + ext);
}
function validateSize_(base64) {
  const mb = Math.floor(base64.length * 3 / 4) / (1024 * 1024);
  if (mb > CONFIG.MAX_FILE_MB) throw new Error('file too large: ' + mb.toFixed(2) + 'MB (limit ' + CONFIG.MAX_FILE_MB + 'MB)');
}
function getOrCreateTargetFolder_(folderName, subfolder) {
  let current = getOrCreateFolderByName_(DriveApp.getRootFolder(), folderName);
  if (!subfolder) return current;
  String(subfolder).split('/').map(function(s){return s.trim();}).filter(Boolean).forEach(function(part){ current = getOrCreateFolderByName_(current, part); });
  return current;
}
function getOrCreateFolderByName_(parentFolder, name) {
  const it = parentFolder.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parentFolder.createFolder(name);
}
function sanitizeName_(s) {
  return String(s || 'module').replace(/[^A-Za-z0-9_\-]/g,'_').slice(0,80) || 'module';
}
