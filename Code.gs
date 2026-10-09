/**
 * The $25K Climb — shared storage backend (Google Apps Script)
 *
 * Serves two things from one deployment:
 *   1. A JSON API the phone app (index.html on your own hosting) talks to.
 *   2. Optionally, the page itself, if an HTML file named "Index" exists
 *      in this project (the earlier web-app setup). Not required for the app.
 *
 * SET THE PASSCODE below, then deploy:
 *   Deploy > New deployment > Web app
 *   Execute as:      Me
 *   Who has access:  Anyone        <- required for the phone app to reach it
 * Copy the web app URL (ends in /exec) into CONFIG.apiUrl in index.html.
 *
 * The passcode is the lock: the URL alone is not enough to read or change
 * anything. Each phone enters it once.
 */

var PASSCODE = 'change-me';   // <- pick a passphrase you both know. '' disables the check.

var KEYS = { settings: 'climb.settings', days: 'climb.days', boosts: 'climb.boosts' };

/* ---------- HTTP entry points ---------- */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action) return json_(handle_(p.action, p));
  try {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('The $25K Climb')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return ContentService.createTextOutput('The $25K Climb backend is running. Open the app to use it.');
  }
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { body = {}; }
  return json_(handle_(body.action, body));
}

function handle_(action, p) {
  try {
    if (PASSCODE && String(p.key || '') !== PASSCODE) return { error: 'bad_key' };
    var patch = p.patch;
    if (typeof patch === 'string') { try { patch = JSON.parse(patch); } catch (err) { patch = {}; } }
    var settings = p.settings;
    if (typeof settings === 'string') { try { settings = JSON.parse(settings); } catch (err) { settings = {}; } }
    switch (String(action || '')) {
      case 'state':         return readState_();
      case 'patchDays':     return patchDays(patch);
      case 'patchBoosts':   return patchBoosts(patch);
      case 'setSettings':   return setSettings(settings);
      case 'resetProgress': return resetProgress();
      default:              return { error: 'unknown_action' };
    }
  } catch (err) {
    return { error: 'server_error', message: String((err && err.message) || err) };
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- storage ---------- */

function props_() {
  return PropertiesService.getScriptProperties();
}

function readState_() {
  var p = props_();
  var settings = null;
  try { settings = JSON.parse(p.getProperty(KEYS.settings) || 'null'); } catch (e) { settings = null; }
  var bits = p.getProperty(KEYS.days) || '';
  var savedDays = [];
  for (var i = 0; i < bits.length && i < 365; i++) {
    if (bits.charAt(i) === '1') savedDays.push(i + 1);
  }
  var boosts = [];
  try { boosts = JSON.parse(p.getProperty(KEYS.boosts) || '[]'); } catch (e) { boosts = []; }
  return { settings: settings, savedDays: savedDays, boosts: boosts, at: new Date().toISOString() };
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/** Used by the google.script.run page, if you kept Index.html in this project. */
function getState() {
  return readState_();
}

/** patch = { d12: true, d13: false, ... } */
function patchDays(patch) {
  return withLock_(function () {
    var p = props_();
    var bits = p.getProperty(KEYS.days) || '';
    while (bits.length < 365) bits += '0';
    var arr = bits.split('');
    Object.keys(patch || {}).forEach(function (k) {
      var n = parseInt(String(k).replace(/^d/, ''), 10);
      if (n >= 1 && n <= 365) arr[n - 1] = patch[k] ? '1' : '0';
    });
    p.setProperty(KEYS.days, arr.join(''));
    return readState_();
  });
}

/** patch = { someId: {amount, note, at} }  or  { someId: null } to remove */
function patchBoosts(patch) {
  return withLock_(function () {
    var p = props_();
    var boosts = [];
    try { boosts = JSON.parse(p.getProperty(KEYS.boosts) || '[]'); } catch (e) { boosts = []; }
    Object.keys(patch || {}).forEach(function (id) {
      boosts = boosts.filter(function (b) { return b && b.id !== id; });
      var v = patch[id];
      if (v && Number(v.amount) > 0) {
        boosts.push({
          id: String(id).slice(0, 40),
          amount: Math.round(Number(v.amount)),
          note: String(v.note || 'Boost').slice(0, 60),
          at: String(v.at || new Date().toISOString())
        });
      }
    });
    boosts.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
    if (boosts.length > 60) boosts = boosts.slice(-60);
    p.setProperty(KEYS.boosts, JSON.stringify(boosts));
    return readState_();
  });
}

function setSettings(s) {
  s = s || {};
  return withLock_(function () {
    var clean = {
      start: /^\d{4}-\d{2}-\d{2}$/.test(String(s.start)) ? String(s.start) : '2026-10-12',
      goal: Math.max(1000, Math.round(Number(s.goal) || 25000)),
      nameA: String(s.nameA || 'Partner A').slice(0, 24),
      nameB: String(s.nameB || 'Partner B').slice(0, 24),
      apy: Math.max(0, Math.min(20, Number(s.apy) || 0))
    };
    props_().setProperty(KEYS.settings, JSON.stringify(clean));
    return readState_();
  });
}

function resetProgress() {
  return withLock_(function () {
    var p = props_();
    p.deleteProperty(KEYS.days);
    p.deleteProperty(KEYS.boosts);
    return readState_();
  });
}
