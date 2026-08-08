/* ============================================================
   AiEvite — shared logic for the invite + admin pages
   No server, no database. All event data is encoded into the
   invite link itself (index.html#i=<base64>).
   ============================================================ */

/* ---- Themes -------------------------------------------------
   Each theme is a set of CSS custom properties applied to <body>
   via data-theme. Blush pink is the default (baby girl).
------------------------------------------------------------- */
const THEMES = {
  seemantham: {
    label: "Seemantham (traditional)",
    vars: {
      "--bg": "#fff4e0",
      "--bg2": "#ffe4bb",
      "--card": "#fffaf0",
      "--ink": "#5a1e22",
      "--muted": "#9a5a3c",
      "--accent": "#c1272d",
      "--accent-strong": "#9e1b23",
      "--gold": "#b8860b",
      "--line": "#eccf9e",
    },
  },
  blush: {
    label: "Blush Pink (girl)",
    vars: {
      "--bg": "#fbeef0",
      "--bg2": "#f6dfe4",
      "--card": "#fffafb",
      "--ink": "#5a3c46",
      "--muted": "#9a7681",
      "--accent": "#d98aa0",
      "--accent-strong": "#c26b85",
      "--gold": "#c9a24b",
      "--line": "#ecd4da",
    },
  },
  neutral: {
    label: "Soft Neutral (sage)",
    vars: {
      "--bg": "#eef1e9",
      "--bg2": "#e3e8d9",
      "--card": "#fdfdfa",
      "--ink": "#41473a",
      "--muted": "#7c8271",
      "--accent": "#9caf88",
      "--accent-strong": "#7d9268",
      "--gold": "#bfa15a",
      "--line": "#d9e0cd",
    },
  },
  blue: {
    label: "Baby Blue (boy)",
    vars: {
      "--bg": "#e9f1f7",
      "--bg2": "#dbe8f3",
      "--card": "#fbfdff",
      "--ink": "#33455a",
      "--muted": "#6f8296",
      "--accent": "#8fb4d6",
      "--accent-strong": "#6a99c2",
      "--gold": "#c9a24b",
      "--line": "#cfe0ee",
    },
  },
  warm: {
    label: "Warm Marigold",
    vars: {
      "--bg": "#fbf0e2",
      "--bg2": "#f6e3cd",
      "--card": "#fffaf3",
      "--ink": "#5a4433",
      "--muted": "#9c7f63",
      "--accent": "#e0a458",
      "--accent-strong": "#c9843a",
      "--gold": "#b9832f",
      "--line": "#efd9bf",
    },
  },
};

function applyTheme(themeKey, root) {
  const theme = THEMES[themeKey] || THEMES.blush;
  const el = root || document.body;
  el.setAttribute("data-theme", themeKey in THEMES ? themeKey : "blush");
  Object.entries(theme.vars).forEach(([k, v]) => el.style.setProperty(k, v));
}

/* ---- Encode / decode ---------------------------------------
   Data travels in the URL. We JSON-stringify, then base64 with a
   URL-safe alphabet so it survives WhatsApp/SMS links.
------------------------------------------------------------- */
// Compact single-letter keys keep the encoded link short.
var KEYMAP = { title:"t", honor:"h", subtitle:"s", date:"d", startTime:"a",
  endTime:"b", venue:"v", address:"r", hero:"g", bgImage:"i", bgDark:"k",
  glass:"l", message:"m", host:"o", theme:"e", rsvpMode:"q", rsvpUrl:"u",
  sheetEndpoint:"n", rsvpLabel:"c", eyebrow:"w", mapUrl:"p", photoEndpoint:"f" };
var REVMAP = {}; Object.keys(KEYMAP).forEach(function (k) { REVMAP[KEYMAP[k]] = k; });

function encodeData(obj) {
  // Map to short keys and drop empty values to shrink the URL.
  var shortObj = {};
  Object.keys(obj).forEach(function (k) {
    var v = obj[k];
    if (v === undefined || v === null || v === "") return;
    shortObj[KEYMAP[k] || k] = v;
  });
  var json = JSON.stringify(shortObj);
  // encodeURIComponent handles unicode (names in any language) before btoa
  var b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeData(str) {
  try {
    var b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var json = decodeURIComponent(escape(atob(b64)));
    var raw = JSON.parse(json);
    // Expand short keys back to full names (old long-key links still work).
    var out = {};
    Object.keys(raw).forEach(function (k) { out[REVMAP[k] || k] = raw[k]; });
    return out;
  } catch (e) {
    return null;
  }
}

/* ---- Link helpers ------------------------------------------ */

// Build the shareable invite URL from a data object.
// baseUrl should point at index.html (defaults to sibling of admin).
function buildInviteUrl(data, baseUrl) {
  const base =
    baseUrl ||
    (location.href.replace(/admin\.html.*$/, "") + "index.html");
  return base + "#i=" + encodeData(data);
}

// Convert a Google Form URL into an embeddable one (adds ?embedded=true).
function toEmbedUrl(url) {
  if (!url) return "";
  const clean = url.split("#")[0];
  if (clean.includes("/viewform")) {
    return clean.replace(/\?.*$/, "") + "?embedded=true";
  }
  // forms.gle short links or others: try appending the param
  return clean + (clean.includes("?") ? "&" : "?") + "embedded=true";
}

// Google Maps search link from an address string.
function buildMapsUrl(address) {
  if (!address) return "";
  return "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(address);
}

// Format "YYYY-MM-DD" + time text into a friendly display string.
function formatEventDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Build a Google Calendar "add event" link.
// date = YYYY-MM-DD, start/end = "HH:MM" (24h) optional.
function buildCalendarUrl(data) {
  if (!data.date) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const toStamp = (dateStr, timeStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    let hh = 10, mm = 0;
    if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
      [hh, mm] = timeStr.split(":").map(Number);
    }
    return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
  };
  const start = toStamp(data.date, data.startTime);
  // default 2h event if no end time
  let endStamp;
  if (data.endTime && /^\d{1,2}:\d{2}$/.test(data.endTime)) {
    endStamp = toStamp(data.date, data.endTime);
  } else {
    const [y, m, d] = data.date.split("-").map(Number);
    let hh = 10, mm = 0;
    if (data.startTime && /^\d{1,2}:\d{2}$/.test(data.startTime)) {
      [hh, mm] = data.startTime.split(":").map(Number);
    }
    hh = (hh + 2) % 24;
    endStamp = `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
  }
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: data.title || "Baby Shower",
    dates: `${start}/${endStamp}`,
    details: data.message || "",
    location: data.address || data.venue || "",
  });
  return "https://www.google.com/calendar/render?" + params.toString();
}

/* Export for module-style use if ever needed; harmless in browser. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    THEMES, applyTheme, encodeData, decodeData, toEmbedUrl,
    buildInviteUrl, buildMapsUrl, formatEventDate, buildCalendarUrl,
  };
}
