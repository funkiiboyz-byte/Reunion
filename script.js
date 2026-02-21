const adminBtn = document.getElementById("adminButton");
const adminDialog = document.getElementById("adminDialog");
const closeDialog = document.getElementById("closeDialog");
const adminLoginForm = document.getElementById("adminLoginForm");
const loginMsg = document.getElementById("loginMsg");
const logoutAdmin = document.getElementById("logoutAdmin");
const adminPanel = document.getElementById("adminPanel");

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

function setVisible(el, show) {
  el.style.display = show ? "" : "none";
}

function applySettings(settings) {
  if (settings.heroTitle) {
    heroTitle.innerHTML = settings.heroTitle;
  }
  if (settings.heroDescription) {
    heroDescription.textContent = settings.heroDescription;
  }
  if (settings.ctaText) {
    registerCta.textContent = settings.ctaText;
  }
  if (settings.bannerSrc) {
    collegeBanner.src = settings.bannerSrc;
  }
  if (settings.highlightsTitle) {
    highlightsTitle.textContent = settings.highlightsTitle;
  }

  setVisible(statsSection, settings.showStats !== false);
  setVisible(highlightsSection, settings.showHighlights !== false);
  setVisible(joinSection, settings.showJoin !== false);
}

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  applySettings(settings);

  titleControl.value = heroTitle.innerHTML;
  descControl.value = heroDescription.textContent;
  ctaControl.value = registerCta.textContent;
  bannerControl.value = collegeBanner.getAttribute("src") || "";
  highlightsTitleControl.value = highlightsTitle.textContent;
  toggleStats.checked = settings.showStats !== false;
  toggleHighlights.checked = settings.showHighlights !== false;
  toggleJoin.checked = settings.showJoin !== false;
}

function saveSettings() {
  const settings = {
    heroTitle: titleControl.value.trim() || heroTitle.innerHTML,
    heroDescription: descControl.value.trim() || heroDescription.textContent,
    ctaText: ctaControl.value.trim() || registerCta.textContent,
    bannerSrc: bannerControl.value.trim() || collegeBanner.getAttribute("src"),
    highlightsTitle: highlightsTitleControl.value.trim() || highlightsTitle.textContent,
    showStats: toggleStats.checked,
    showHighlights: toggleHighlights.checked,
    showJoin: toggleJoin.checked,
  };

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applySettings(settings);
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

saveAdmin.addEventListener("click", saveSettings);

loadSettings();
setAdminState(sessionStorage.getItem(SESSION_KEY) === "true");
