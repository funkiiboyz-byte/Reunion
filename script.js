const adminBtn = document.getElementById("adminButton");
const adminDialog = document.getElementById("adminDialog");
const closeDialog = document.getElementById("closeDialog");
const adminLoginForm = document.getElementById("adminLoginForm");
const loginMsg = document.getElementById("loginMsg");
const logoutAdmin = document.getElementById("logoutAdmin");
const adminPanel = document.getElementById("adminPanel");
const syncStatus = document.getElementById("syncStatus");

const heroTitle = document.getElementById("heroTitle");
const heroDescription = document.getElementById("heroDescription");
const registerCta = document.getElementById("registerCta");
const collegeBanner = document.getElementById("collegeBanner");
const statsSection = document.getElementById("statsSection");
const highlightsSection = document.getElementById("highlights");
const joinSection = document.getElementById("join");
const highlightsTitle = document.getElementById("highlightsTitle");

const titleControl = document.getElementById("titleControl");
const descControl = document.getElementById("descControl");
const ctaControl = document.getElementById("ctaControl");
const bannerControl = document.getElementById("bannerControl");
const highlightsTitleControl = document.getElementById("highlightsTitleControl");
const toggleStats = document.getElementById("toggleStats");
const toggleHighlights = document.getElementById("toggleHighlights");
const toggleJoin = document.getElementById("toggleJoin");
const saveAdmin = document.getElementById("saveAdmin");

const SETTINGS_KEY = "agc-reunion-admin-settings";
const SESSION_KEY = "agc-reunion-admin-session";

const SUPABASE_URL = "https://urlfmhgurdrernlpuyjj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVybGZtaGd1cmRyZXJubHB1eWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODY4ODgsImV4cCI6MjA4NzI2Mjg4OH0.GZrIbCe207CZ3A7pCmcm5MyhcGqxix-g7S-dsndhhM8";

let supabaseClient = null;

function setVisible(el, show) {
  el.style.display = show ? "" : "none";
}

function collectSettingsFromControls() {
  return {
    heroTitle: titleControl.value.trim() || heroTitle.innerHTML,
    heroDescription: descControl.value.trim() || heroDescription.textContent,
    ctaText: ctaControl.value.trim() || registerCta.textContent,
    bannerSrc: bannerControl.value.trim() || collegeBanner.getAttribute("src"),
    highlightsTitle: highlightsTitleControl.value.trim() || highlightsTitle.textContent,
    showStats: toggleStats.checked,
    showHighlights: toggleHighlights.checked,
    showJoin: toggleJoin.checked,
  };
}

function applySettings(settings) {
  if (settings.heroTitle) heroTitle.innerHTML = settings.heroTitle;
  if (settings.heroDescription) heroDescription.textContent = settings.heroDescription;
  if (settings.ctaText) registerCta.textContent = settings.ctaText;
  if (settings.bannerSrc) collegeBanner.src = settings.bannerSrc;
  if (settings.highlightsTitle) highlightsTitle.textContent = settings.highlightsTitle;

  setVisible(statsSection, settings.showStats !== false);
  setVisible(highlightsSection, settings.showHighlights !== false);
  setVisible(joinSection, settings.showJoin !== false);
}

function hydrateControls(settings = {}) {
  titleControl.value = settings.heroTitle || heroTitle.innerHTML;
  descControl.value = settings.heroDescription || heroDescription.textContent;
  ctaControl.value = settings.ctaText || registerCta.textContent;
  bannerControl.value = settings.bannerSrc || collegeBanner.getAttribute("src") || "";
  highlightsTitleControl.value = settings.highlightsTitle || highlightsTitle.textContent;
  toggleStats.checked = settings.showStats !== false;
  toggleHighlights.checked = settings.showHighlights !== false;
  toggleJoin.checked = settings.showJoin !== false;
}

function getLocalSettings() {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
}

function setLocalSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function setSyncStatus(text, kind = "normal") {
  syncStatus.textContent = text;
  syncStatus.dataset.kind = kind;
}

function setAdminState(isLoggedIn) {
  if (isLoggedIn) {
    adminPanel.classList.add("open");
    adminPanel.setAttribute("aria-hidden", "false");
    sessionStorage.setItem(SESSION_KEY, "true");
    return;
  }

  adminPanel.classList.remove("open");
  adminPanel.setAttribute("aria-hidden", "true");
  sessionStorage.removeItem(SESSION_KEY);
}

function initSupabase() {
  if (!window.supabase || !window.supabase.createClient) {
    setSyncStatus("Sync: Supabase library load failed, local mode active", "error");
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  setSyncStatus("Sync: Supabase connected", "success");
}

async function loadRemoteSettings() {
  if (!supabaseClient) return null;

  const { data, error } = await supabaseClient
    .from("site_settings")
    .select("settings")
    .eq("id", 1)
    .single();

  if (error) {
    setSyncStatus("Sync: Supabase read failed, using local settings", "error");
    return null;
  }

  return data?.settings || null;
}

async function saveRemoteSettings(settings) {
  if (!supabaseClient) return false;

  const { error } = await supabaseClient
    .from("site_settings")
    .upsert({ id: 1, settings }, { onConflict: "id" });

  if (error) {
    setSyncStatus("Sync: Supabase save failed, local save done", "error");
    return false;
  }

  setSyncStatus("Sync: Saved to Supabase + Local", "success");
  return true;
}

async function loadSettings() {
  const localSettings = getLocalSettings();
  applySettings(localSettings);
  hydrateControls(localSettings);

  const remoteSettings = await loadRemoteSettings();
  if (remoteSettings) {
    applySettings(remoteSettings);
    hydrateControls(remoteSettings);
    setLocalSettings(remoteSettings);
    setSyncStatus("Sync: Loaded from Supabase", "success");
  }
}

async function saveSettings() {
  const settings = collectSettingsFromControls();
  applySettings(settings);
  setLocalSettings(settings);

  if (!supabaseClient) {
    setSyncStatus("Sync: Saved locally (Supabase unavailable)", "error");
    return;
  }

  await saveRemoteSettings(settings);
}

adminBtn.addEventListener("click", () => {
  loginMsg.textContent = "";
  adminDialog.showModal();
});

closeDialog.addEventListener("click", () => {
  adminDialog.close();
});

logoutAdmin.addEventListener("click", () => {
  setAdminState(false);
});

adminLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const user = document.getElementById("adminUser").value.trim();
  const pass = document.getElementById("adminPass").value.trim();

  if (user === "admin" && pass === "hsc2020") {
    loginMsg.textContent = "";
    adminDialog.close();
    setAdminState(true);
  } else {
    loginMsg.textContent = "ভুল username/password!";
  }
});

saveAdmin.addEventListener("click", () => {
  saveSettings();
});

initSupabase();
loadSettings();
setAdminState(sessionStorage.getItem(SESSION_KEY) === "true");
