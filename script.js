const adminBtn = document.getElementById("adminButton");
const adminDialog = document.getElementById("adminDialog");
const closeDialog = document.getElementById("closeDialog");
const adminLoginForm = document.getElementById("adminLoginForm");
const loginMsg = document.getElementById("loginMsg");
const logoutAdmin = document.getElementById("logoutAdmin");
const adminPanel = document.getElementById("adminPanel");
const syncStatus = document.getElementById("syncStatus");

const topRegisterBtn = document.getElementById("topRegisterBtn");
const joinForm = document.getElementById("joinForm");
const formStatus = document.getElementById("formStatus");
const downloadRegistrations = document.getElementById("downloadRegistrations");
const registrationsCount = document.getElementById("registrationsCount");
const registrationLiveCount = document.getElementById("registrationLiveCount");
const registrantsTickerTrack = document.getElementById("registrantsTickerTrack");
const successDialog = document.getElementById("successDialog");
const successDialogText = document.getElementById("successDialogText");
const successDialogClose = document.getElementById("successDialogClose");

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
const LOCAL_REG_KEY = "agc-reunion-local-registrations";

const SUPABASE_URL = "https://urlfmhgurdrernlpuyjj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVybGZtaGd1cmRyZXJubHB1eWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODY4ODgsImV4cCI6MjA4NzI2Mjg4OH0.GZrIbCe207CZ3A7pCmcm5MyhcGqxix-g7S-dsndhhM8";

let supabaseClient = null;

function setVisible(el, show) {
  el.style.display = show ? "" : "none";
}

function setSyncStatus(text, kind = "normal") {
  syncStatus.textContent = text;
  syncStatus.dataset.kind = kind;
}

function setFormStatus(text, kind = "normal") {
  formStatus.textContent = text;
  formStatus.dataset.kind = kind;
}

function showSuccessPopup(message) {
  if (!successDialog || !successDialogText) return;
  successDialogText.textContent = message;
  if (!successDialog.open) {
    successDialog.showModal();
  }
}

function scrollToJoinSection() {
  joinSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearInitialJoinHash() {
  if (window.location.hash === "#join") {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

function getLocalRegistrations() {
  return JSON.parse(localStorage.getItem(LOCAL_REG_KEY) || "[]");
}

function saveLocalRegistration(payload) {
  const rows = getLocalRegistrations();
  rows.push({
    id: `local-${Date.now()}`,
    ...payload,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(LOCAL_REG_KEY, JSON.stringify(rows));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatGroupLabel(groupName) {
  const key = String(groupName || "").toLowerCase();
  if (key === "science") return "Science";
  if (key === "humanities") return "Humanities";
  if (key === "business") return "Business";
  return groupName || "Group";
}

function renderRegistrantsTicker(rows) {
  if (!registrantsTickerTrack) return;

  if (!rows || rows.length === 0) {
    registrantsTickerTrack.innerHTML = '<span class="marquee-item">No registrations yet</span>';
    return;
  }

  const items = rows
    .map((row) => `<span class="marquee-item">${escapeHtml(row.name)} • ${escapeHtml(formatGroupLabel(row.group_name))}</span>`)
    .join("");

  registrantsTickerTrack.innerHTML = `${items}${items}`;
}

async function refreshRegistrantsTicker() {
  const localRows = getLocalRegistrations();

  if (!supabaseClient) {
    renderRegistrantsTicker(localRows.slice(-25));
    return;
  }

  const { data, error } = await supabaseClient
    .from("registrations")
    .select("name, group_name, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    renderRegistrantsTicker(localRows.slice(-25));
    return;
  }

  const merged = [...data, ...localRows]
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, 30);

  renderRegistrantsTicker(merged);
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
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  setSyncStatus("Sync: Supabase connected", "success");
}

async function loadRemoteSettings() {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from("site_settings").select("settings").eq("id", 1).single();
  if (error) {
    setSyncStatus("Sync: Supabase read failed, using local settings", "error");
    return null;
  }
  return data?.settings || null;
}

async function saveRemoteSettings(settings) {
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.from("site_settings").upsert({ id: 1, settings }, { onConflict: "id" });
  if (error) {
    const hint = error.message ? ` (${error.message})` : "";
    setSyncStatus(`Sync: Supabase save failed, local save done${hint}`, "error");
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

async function submitRegistration(payload) {
  if (!supabaseClient) {
    saveLocalRegistration(payload);
    setFormStatus("Supabase unavailable. Local backup save হয়েছে।", "success");
    return true;
  }

  const { error } = await supabaseClient.from("registrations").insert(payload);
  if (error) {
    saveLocalRegistration(payload);
    const hint = error.message ? ` (${error.message})` : "";
    if (String(error.message || "").includes("LockManager") || String(error.message || "").includes("timed out")) {
      setFormStatus("Chrome lock timeout: local backup save হয়েছে, refresh দিয়ে আবার try করো।", "error");
    } else {
      setFormStatus(`Supabase save হয়নি, local backup save হয়েছে${hint}`, "error");
    }
    return true;
  }

  setFormStatus("Registration successful ✅", "success");
  showSuccessPopup("🎉 অভিনন্দন! তোমার seat confirmed হয়েছে। Reunion-এ স্বাগতম!");
  return true;
}

function toCsv(rows) {
  const headers = ["ID", "Name", "Phone", "Group", "Profession", "Created At"];
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const cols = [row.id, row.name, row.phone, row.group_name, row.profession, row.created_at].map(
      (v) => `"${String(v ?? "").replaceAll('"', '""')}"`,
    );
    lines.push(cols.join(","));
  });
  return lines.join("\n");
}

async function downloadRegistrationsCsv() {
  const localRows = getLocalRegistrations();

  if (!supabaseClient) {
    if (localRows.length === 0) {
      setSyncStatus("Export failed: কোনো data নেই", "error");
      return;
    }
    const csv = toCsv(localRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reunion-registrations-local-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setSyncStatus("Export success: local CSV downloaded", "success");
    return;
  }

  const { data, error } = await supabaseClient
    .from("registrations")
    .select("id, name, phone, group_name, profession, created_at")
    .order("id", { ascending: true });

  if (error) {
    if (localRows.length > 0) {
      const csv = toCsv(localRows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reunion-registrations-local-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSyncStatus("Export fallback: local CSV downloaded", "error");
      return;
    }

    setSyncStatus("Export failed: registrations table access issue", "error");
    return;
  }

  registrationsCount.textContent = `Registrations: ${data.length + localRows.length}`;
  const allRows = [...data, ...localRows];
  const csv = toCsv(allRows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reunion-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setSyncStatus("Export success: CSV downloaded", "success");
}

async function refreshRegistrationCount() {
  const localCount = getLocalRegistrations().length;
  if (!supabaseClient) {
    const total = localCount;
    if (registrationsCount) registrationsCount.textContent = `Registrations: ${total}`;
    if (registrationLiveCount) registrationLiveCount.textContent = String(total);
    return;
  }

  const { count, error } = await supabaseClient.from("registrations").select("id", { count: "exact", head: true });
  if (!error) {
    const total = (count ?? 0) + localCount;
    if (registrationsCount) registrationsCount.textContent = `Registrations: ${total}`;
    if (registrationLiveCount) registrationLiveCount.textContent = String(total);
  }
}


function setupLiveRealtimeSync() {
  if (!supabaseClient) return;

  supabaseClient
    .channel("public:registrations-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "registrations" },
      () => {
        refreshRegistrationCount();
        refreshRegistrantsTicker();
      },
    )
    .subscribe();
}

if (adminBtn) adminBtn.addEventListener("click", () => {
  loginMsg.textContent = "";
  adminDialog.showModal();
});
if (closeDialog) closeDialog.addEventListener("click", () => adminDialog.close());
if (successDialogClose) successDialogClose.addEventListener("click", () => successDialog.close());

if (logoutAdmin) logoutAdmin.addEventListener("click", async () => {
  setAdminState(false);
  if (supabaseClient) await supabaseClient.auth.signOut();
});

if (adminLoginForm) adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabaseClient) {
    loginMsg.textContent = "Supabase unavailable. পরে আবার চেষ্টা করো।";
    return;
  }

  const email = document.getElementById("adminEmail").value.trim().toLowerCase();
  const pass = document.getElementById("adminPass").value.trim();

  const { error: authError } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
  if (authError) {
    const message = String(authError.message || "");
    if (message.includes("LockManager") || message.includes("timed out")) {
      loginMsg.textContent = "Chrome lock timeout হয়েছে। page refresh করে আবার login দাও।";
    } else {
      loginMsg.textContent = "Login failed: email/password ভুল বা user নেই।";
    }
    return;
  }

  const { data: approvedRows, error: approvalError } = await supabaseClient
    .from("admin_approved_emails")
    .select("id, email, is_active")
    .eq("is_active", true)
    .ilike("email", email)
    .limit(1);

  if (approvalError || !approvedRows || approvedRows.length === 0) {
    await supabaseClient.auth.signOut();
    loginMsg.textContent = "এই email admin হিসেবে approve করা হয়নি।";
    return;
  }

  loginMsg.textContent = "";
  adminDialog.close();
  setAdminState(true);
  setSyncStatus("Admin verified via approved email", "success");
});

if (joinForm) joinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(joinForm);
  const submitBtn = joinForm.querySelector("button[type='submit']");

  const payload = {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    group_name: String(formData.get("group") || "").trim(),
    profession: String(formData.get("profession") || "").trim(),
  };

  setFormStatus("Saving registration...", "normal");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";
  }

  const ok = await submitRegistration(payload);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirm Seat";
  }

  if (ok) {
    joinForm.reset();
    refreshRegistrationCount();
    refreshRegistrantsTicker();
  }
});

if (saveAdmin) saveAdmin.addEventListener("click", async () => {
  saveAdmin.disabled = true;
  const previousText = saveAdmin.textContent;
  saveAdmin.textContent = "Saving...";
  await saveSettings();
  saveAdmin.disabled = false;
  saveAdmin.textContent = previousText;
});

if (downloadRegistrations) downloadRegistrations.addEventListener("click", () => downloadRegistrationsCsv());
if (registerCta) registerCta.addEventListener("click", scrollToJoinSection);
if (topRegisterBtn) topRegisterBtn.addEventListener("click", scrollToJoinSection);

clearInitialJoinHash();
initSupabase();
loadSettings();
refreshRegistrationCount();
refreshRegistrantsTicker();
setupLiveRealtimeSync();
setAdminState(sessionStorage.getItem(SESSION_KEY) === "true");
