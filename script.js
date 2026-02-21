const adminBtn = document.getElementById("adminButton");
const adminDialog = document.getElementById("adminDialog");
const closeDialog = document.getElementById("closeDialog");
const adminLoginForm = document.getElementById("adminLoginForm");
const loginMsg = document.getElementById("loginMsg");
const adminPanel = document.getElementById("adminPanel");

const heroTitle = document.getElementById("heroTitle");
const collegeBanner = document.getElementById("collegeBanner");
const highlightsSection = document.getElementById("highlights");
const joinSection = document.getElementById("join");

const titleControl = document.getElementById("titleControl");
const bannerControl = document.getElementById("bannerControl");
const toggleHighlights = document.getElementById("toggleHighlights");
const toggleJoin = document.getElementById("toggleJoin");
const saveAdmin = document.getElementById("saveAdmin");

const STORAGE_KEY = "agc-reunion-admin-settings";

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

  if (settings.heroTitle) {
    heroTitle.innerHTML = settings.heroTitle;
  }
  if (settings.bannerSrc) {
    collegeBanner.src = settings.bannerSrc;
  }

  const showHighlights = settings.showHighlights !== false;
  const showJoin = settings.showJoin !== false;

  highlightsSection.style.display = showHighlights ? "block" : "none";
  joinSection.style.display = showJoin ? "block" : "none";

  titleControl.value = heroTitle.innerHTML;
  bannerControl.value = collegeBanner.src;
  toggleHighlights.checked = showHighlights;
  toggleJoin.checked = showJoin;
}

function saveSettings() {
  const settings = {
    heroTitle: titleControl.value.trim() || heroTitle.innerHTML,
    bannerSrc: bannerControl.value.trim() || collegeBanner.src,
    showHighlights: toggleHighlights.checked,
    showJoin: toggleJoin.checked,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  loadSettings();
}

adminBtn.addEventListener("click", () => {
  loginMsg.textContent = "";
  adminDialog.showModal();
});

closeDialog.addEventListener("click", () => {
  adminDialog.close();
});

adminLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const user = document.getElementById("adminUser").value.trim();
  const pass = document.getElementById("adminPass").value.trim();

  if (user === "admin" && pass === "hsc2020") {
    adminDialog.close();
    adminPanel.classList.add("open");
    adminPanel.setAttribute("aria-hidden", "false");
  } else {
    loginMsg.textContent = "ভুল username/password!";
  }
});

saveAdmin.addEventListener("click", saveSettings);

loadSettings();
