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
const adminRegistrationsList = document.getElementById("adminRegistrationsList");

const heroTitle = document.getElementById("heroTitle");
const heroDescription = document.getElementById("heroDescription");
const registerCta = document.getElementById("registerCta");
const collegeBanner = document.getElementById("collegeBanner");
const collegeBannerSecondary = document.getElementById("collegeBannerSecondary");
const bannerSlider = document.getElementById("bannerSlider");
const statsSection = document.getElementById("statsSection");
const highlightsSection = document.getElementById("highlights");
const joinSection = document.getElementById("join");
const highlightsTitle = document.getElementById("highlightsTitle");

const titleControl = document.getElementById("titleControl");
const descControl = document.getElementById("descControl");
const ctaControl = document.getElementById("ctaControl");
const bannerUploadControl = document.getElementById("bannerUploadControl");
const bannerUploadsList = document.getElementById("bannerUploadsList");
const highlightsTitleControl = document.getElementById("highlightsTitleControl");
const toggleStats = document.getElementById("toggleStats");
const toggleHighlights = document.getElementById("toggleHighlights");
const toggleJoin = document.getElementById("toggleJoin");
const saveAdmin = document.getElementById("saveAdmin");

const SETTINGS_KEY = "agc-reunion-admin-settings";
const SESSION_KEY = "agc-reunion-admin-session";
const LOCAL_REG_KEY = "agc-reunion-local-registrations";
const LOCAL_BANNER_UPLOAD_KEY = "agc-reunion-local-banner-uploads";

const SUPABASE_URL = "https://urlfmhgurdrernlpuyjj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVybGZtaGd1cmRyZXJubHB1eWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODY4ODgsImV4cCI6MjA4NzI2Mjg4OH0.GZrIbCe207CZ3A7pCmcm5MyhcGqxix-g7S-dsndhhM8";

let supabaseClient = null;
let bannerImages = [];
let bannerSlideIndex = 0;
let bannerSlideTimer = null;
let uploadedBannerImages = [];

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


function normalizeBannerImagesFromText(text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.flatMap((line) =>
    line
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^0-9+]/g, "");
}

function preloadBannerImages(urls) {
  const list = Array.isArray(urls) ? urls : [];
  list.forEach((src) => {
    const value = String(src || "").trim();
    if (!value) return;
    const img = new Image();
    img.decoding = "async";
    img.src = value;
  });
}

function startBannerSlider() {
  if (!collegeBanner || !collegeBannerSecondary) return;
  if (bannerSlideTimer) clearInterval(bannerSlideTimer);

  if (!bannerImages || bannerImages.length === 0) {
    bannerImages = [collegeBanner.getAttribute("src") || "assets/college-banner.svg"];
  }

  bannerSlideIndex = 0;
  collegeBanner.src = bannerImages[0];
  collegeBannerSecondary.src = bannerImages[0];
  collegeBanner.classList.add("is-active");
  collegeBannerSecondary.classList.remove("is-active");

  if (bannerImages.length <= 1) return;

  bannerSlideTimer = setInterval(() => {
    const nextIndex = (bannerSlideIndex + 1) % bannerImages.length;
    const active = collegeBanner.classList.contains("is-active") ? collegeBanner : collegeBannerSecondary;
    const standby = active === collegeBanner ? collegeBannerSecondary : collegeBanner;

    standby.src = bannerImages[nextIndex];
    standby.classList.add("is-active");
    active.classList.remove("is-active");
    bannerSlideIndex = nextIndex;
  }, 4600);
}

function updateBannerImagesFromSettings(settings) {
  const legacyText = String(settings?.bannerImagesText || "");
  const parsed = normalizeBannerImagesFromText(legacyText);
  const merged = [...uploadedBannerImages.map((row) => row.image_data), ...parsed].filter(Boolean);

  if (merged.length > 0) {
    bannerImages = Array.from(new Set(merged));
  } else {
    bannerImages = [collegeBanner.getAttribute("src") || "assets/college-banner.svg"];
  }
  preloadBannerImages(bannerImages);
  startBannerSlider();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });
}

async function handleBannerFileUploads(fileList) {
  const files = Array.from(fileList || []).filter((file) => String(file.type || "").startsWith("image/"));
  if (files.length === 0) {
    setSyncStatus("Please select valid image files", "error");
    return;
  }

  const maxFiles = 10;
  const selected = files.slice(0, maxFiles);

  try {
    const dataUrls = await Promise.all(selected.map((file) => readFileAsDataUrl(file)));

    if (supabaseClient) {
      const rows = dataUrls.map((imageData) => ({ image_data: imageData }));
      const { error } = await supabaseClient.from("banner_images").insert(rows);
      if (error) {
        throw new Error(error.message || "Supabase banner upload failed");
      }
      await loadUploadedBannerImages();
    } else {
      const local = getLocalBannerUploads();
      const mergedLocal = Array.from(new Set([...local, ...dataUrls]));
      setLocalBannerUploads(mergedLocal);
      uploadedBannerImages = mergedLocal.map((image_data, idx) => ({ id: `local-${idx}`, image_data, source: "local" }));
      renderBannerUploadsList();
      setSyncStatus("Uploaded locally (Supabase unavailable)", "error");
    }

    const settings = collectSettingsFromControls();
    applySettings(settings);
    setLocalSettings(settings);
    if (supabaseClient) {
      await saveRemoteSettings(settings);
    }

    setSyncStatus(`Added ${dataUrls.length} image(s) to banner database`, "success");
  } catch (error) {
    setSyncStatus(`Image upload failed (${error.message || "unknown error"})`, "error");
  } finally {
    if (bannerUploadControl) bannerUploadControl.value = "";
  }
}

function getLocalBannerUploads() {
  return JSON.parse(localStorage.getItem(LOCAL_BANNER_UPLOAD_KEY) || "[]");
}

function setLocalBannerUploads(rows) {
  localStorage.setItem(LOCAL_BANNER_UPLOAD_KEY, JSON.stringify(rows));
}

function renderBannerUploadsList() {
  if (!bannerUploadsList) return;

  if (!uploadedBannerImages || uploadedBannerImages.length === 0) {
    bannerUploadsList.innerHTML = '<p class="admin-empty">No uploaded images yet.</p>';
    return;
  }

  bannerUploadsList.innerHTML = uploadedBannerImages
    .map((row, index) => {
      const id = String(row.id || "");
      const shortLabel = row.source === "local" ? `Local upload #${index + 1}` : `DB image #${id}`;
      return `<div class="banner-upload-row"><div class="banner-upload-preview"><img src="${escapeHtml(row.image_data)}" alt="${escapeHtml(shortLabel)}" loading="lazy" decoding="async" /></div><span class="banner-upload-info">${escapeHtml(shortLabel)}</span><button class="btn btn-danger btn-sm" data-remove-banner-id="${escapeHtml(id)}" type="button">Remove</button></div>`;
    })
    .join("");
}

async function loadUploadedBannerImages() {
  if (!supabaseClient) {
    const localRows = getLocalBannerUploads();
    uploadedBannerImages = localRows.map((image_data, idx) => ({ id: `local-${idx}`, image_data, source: "local" }));
    renderBannerUploadsList();
    return;
  }

  const { data, error } = await supabaseClient
    .from("banner_images")
    .select("id, image_data, created_at")
    .order("created_at", { ascending: true })
    .limit(40);

  if (error) {
    const localRows = getLocalBannerUploads();
    uploadedBannerImages = localRows.map((image_data, idx) => ({ id: `local-${idx}`, image_data, source: "local" }));
    renderBannerUploadsList();
    return;
  }

  uploadedBannerImages = (data || [])
    .map((row) => ({ id: row.id, image_data: String(row.image_data || "").trim(), source: "db" }))
    .filter((row) => row.image_data);
  renderBannerUploadsList();
}

async function removeUploadedBannerImageById(id, buttonEl) {
  if (!id) return;

  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = "Removing...";
  }

  if (String(id).startsWith("local-")) {
    const idx = Number(String(id).replace("local-", ""));
    const localRows = getLocalBannerUploads();
    if (!Number.isNaN(idx) && idx >= 0 && idx < localRows.length) {
      localRows.splice(idx, 1);
      setLocalBannerUploads(localRows);
    }
    await loadUploadedBannerImages();
    const settings = collectSettingsFromControls();
    applySettings(settings);
    setLocalSettings(settings);
    setSyncStatus("Local banner image removed", "success");
    return;
  }

  if (!supabaseClient) {
    setSyncStatus("Supabase unavailable: remove failed", "error");
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = "Remove";
    }
    return;
  }

  const numericId = Number(id);
  const { error } = await supabaseClient.from("banner_images").delete().eq("id", numericId);
  if (error) {
    setSyncStatus(`Banner remove failed (${error.message || "unknown error"})`, "error");
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = "Remove";
    }
    return;
  }

  await loadUploadedBannerImages();
  const settings = collectSettingsFromControls();
  applySettings(settings);
  setLocalSettings(settings);
  setSyncStatus("Banner image removed", "success");
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

function removeLocalRegistrationById(id) {
  const rows = getLocalRegistrations().filter((row) => String(row.id) !== String(id));
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
  updateBannerImagesFromSettings(settings);
  if (settings.highlightsTitle) highlightsTitle.textContent = settings.highlightsTitle;

  setVisible(statsSection, settings.showStats !== false);
  setVisible(highlightsSection, settings.showHighlights !== false);
  setVisible(joinSection, settings.showJoin !== false);
}

function hydrateControls(settings = {}) {
  titleControl.value = settings.heroTitle || heroTitle.innerHTML;
  descControl.value = settings.heroDescription || heroDescription.textContent;
  ctaControl.value = settings.ctaText || registerCta.textContent;
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
  await loadUploadedBannerImages();
  applySettings(localSettings);
  hydrateControls(localSettings);

  const remoteSettings = await loadRemoteSettings();
  if (remoteSettings) {
    await loadUploadedBannerImages();
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

async function hasDuplicatePhone(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;

  const localDuplicate = getLocalRegistrations().some((row) => normalizePhone(row.phone) === normalized);
  if (localDuplicate) return true;

  if (!supabaseClient) return false;

  const { data, error } = await supabaseClient
    .from("registrations")
    .select("id, phone")
    .eq("phone", phone)
    .limit(1);

  if (!error && data && data.length > 0) return true;

  const { data: allRows, error: allError } = await supabaseClient
    .from("registrations")
    .select("id, phone")
    .limit(300);

  if (allError) return false;
  return (allRows || []).some((row) => normalizePhone(row.phone) === normalized);
}

async function submitRegistration(payload) {
  if (!supabaseClient) {
    saveLocalRegistration(payload);
    setFormStatus("Supabase unavailable. Local backup save হয়েছে।", "success");
    return true;
  }

  const { error } = await supabaseClient.from("registrations").insert(payload);
  if (error) {
    if (String(error.message || "").toLowerCase().includes("duplicate") || String(error.message || "").toLowerCase().includes("unique")) {
      setFormStatus("এই ফোন নাম্বার দিয়ে আগেই registration করা হয়েছে।", "error");
      return false;
    }
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
  const headers = ["ID", "Name", "Phone", "Group", "Profession", "Comment", "Created At"];
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const cols = [row.id, row.name, row.phone, row.group_name, row.profession, row.comment, row.created_at].map(
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
    .select("id, name, phone, group_name, profession, comment, created_at")
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
        refreshAdminRegistrations();
      },
    )
    .subscribe();
}


async function fetchAllRegistrations() {
  const localRows = getLocalRegistrations();
  if (!supabaseClient) {
    return localRows.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  }

  const { data, error } = await supabaseClient
    .from("registrations")
    .select("id, name, group_name, comment, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return localRows.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  }

  return [...data, ...localRows].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

function renderAdminRegistrations(rows) {
  if (!adminRegistrationsList) return;

  if (!rows || rows.length === 0) {
    adminRegistrationsList.innerHTML = '<p class="admin-empty">No registrations পাওয়া যায়নি।</p>';
    return;
  }

  adminRegistrationsList.innerHTML = rows
    .map((row) => {
      const id = String(row.id);
      const name = escapeHtml(row.name || "Unknown");
      const groupLabel = escapeHtml(formatGroupLabel(row.group_name));
      const comment = row.comment ? `<small>💬 ${escapeHtml(row.comment)}</small>` : "";
      return `<div class="admin-row"><div class="admin-row-info"><div>${name}</div><small>${groupLabel}</small>${comment}</div><button class="btn btn-danger btn-sm" data-remove-id="${id}" type="button">Remove</button></div>`;
    })
    .join("");
}

async function refreshAdminRegistrations() {
  const rows = await fetchAllRegistrations();
  renderAdminRegistrations(rows);
}

async function removeRegistrationById(id, rowEl, buttonEl) {
  if (rowEl) rowEl.classList.add("removing");
  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = "Removing...";
  }

  if (String(id).startsWith("local-")) {
    removeLocalRegistrationById(id);
    setSyncStatus("Local registration removed", "success");
    await refreshRegistrationCount();
    await refreshRegistrantsTicker();
    await refreshAdminRegistrations();
    return;
  }

  if (!supabaseClient) {
    setSyncStatus("Supabase unavailable: remove failed", "error");
    if (rowEl) rowEl.classList.remove("removing");
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = "Remove";
    }
    return;
  }

  const numericId = Number(id);
  const targetId = Number.isNaN(numericId) ? null : numericId;

  let removeError = null;

  if (targetId !== null) {
    const { data: rpcResult, error: rpcError } = await supabaseClient.rpc("delete_registration_admin", { reg_id: targetId });
    if (rpcError || rpcResult !== true) {
      removeError = rpcError || new Error("Admin RPC delete rejected");
    }
  } else {
    removeError = new Error("Invalid registration id");
  }

  if (removeError) {
    const { error: directDeleteError } = await supabaseClient.from("registrations").delete().eq("id", targetId ?? id);
    if (directDeleteError) {
      setSyncStatus(`Remove failed (${directDeleteError.message || removeError.message || "unknown error"})`, "error");
      if (rowEl) rowEl.classList.remove("removing");
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.textContent = "Remove";
      }
      return;
    }
  }

  setSyncStatus("Registration removed successfully", "success");
  await refreshRegistrationCount();
  await refreshRegistrantsTicker();
  await refreshAdminRegistrations();
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
    phone: normalizePhone(String(formData.get("phone") || "").trim()),
    group_name: String(formData.get("group") || "").trim(),
    profession: String(formData.get("profession") || "").trim(),
    comment: String(formData.get("comment") || "").trim(),
  };

  const duplicate = await hasDuplicatePhone(payload.phone);
  if (duplicate) {
    setFormStatus("এই ফোন নাম্বার দিয়ে আগেই registration করা হয়েছে।", "error");
    return;
  }

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
    refreshAdminRegistrations();
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
if (adminRegistrationsList) adminRegistrationsList.addEventListener("click", async (event) => {
  const clicked = event.target;
  if (!(clicked instanceof Element)) return;

  const target = clicked.closest("[data-remove-id]");
  if (!target) return;

  const removeId = target.getAttribute("data-remove-id");
  if (!removeId) return;

  const rowEl = target.closest(".admin-row");
  await removeRegistrationById(removeId, rowEl, target);
});

if (bannerUploadsList) bannerUploadsList.addEventListener("click", async (event) => {
  const clicked = event.target;
  if (!(clicked instanceof Element)) return;

  const target = clicked.closest("[data-remove-banner-id]");
  if (!target) return;

  const removeId = target.getAttribute("data-remove-banner-id");
  if (!removeId) return;

  await removeUploadedBannerImageById(removeId, target);
});

if (registerCta) registerCta.addEventListener("click", scrollToJoinSection);
if (topRegisterBtn) topRegisterBtn.addEventListener("click", scrollToJoinSection);

if (document) {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (bannerSlideTimer) {
        clearInterval(bannerSlideTimer);
        bannerSlideTimer = null;
      }
      return;
    }
    startBannerSlider();
  });
}

if (bannerUploadControl) bannerUploadControl.addEventListener("change", async (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.files) return;
  await handleBannerFileUploads(input.files);
});

clearInitialJoinHash();
initSupabase();
loadSettings();
refreshRegistrationCount();
refreshRegistrantsTicker();
refreshAdminRegistrations();
setupLiveRealtimeSync();
setAdminState(sessionStorage.getItem(SESSION_KEY) === "true");
