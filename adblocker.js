// Ad blocker functionality has been disabled.
// This file is kept only so existing <script src="adblocker.js"> tags
// on pages do not break. It now only manages a simple dark theme toggle.

console.log("Nebulo [AdBlocker] Ad blocking is disabled; only theme preferences are handled.");

function loadSettings() {
  try {
    const raw = localStorage.getItem("settings") || "{}";
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    console.warn("Nebulo [AdBlocker] Failed to parse settings from localStorage, resetting.", e);
    return {};
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem("settings", JSON.stringify(settings || {}));
  } catch (e) {
    console.warn("Nebulo [AdBlocker] Failed to save settings.", e);
  }
}

function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
  console.log("Nebulo [AdBlocker] Theme applied:", isDark ? "dark" : "light");
}

function initThemeControls() {
  const toggleTheme  = document.getElementById("toggleTheme");
  const clearDataBtn = document.getElementById("clearData");

  const settings = loadSettings();
  const darkTheme = settings.darkTheme ?? false;

  // Apply stored theme preference on any page
  applyTheme(darkTheme);

  if (!toggleTheme && !clearDataBtn) {
    // No controls on this page (e.g., game pages) – nothing more to wire.
    console.log("Nebulo [AdBlocker] No theme controls found on this page.");
    return;
  }

  if (toggleTheme) {
    toggleTheme.checked = darkTheme;
    toggleTheme.addEventListener("change", () => {
      const enabled = !!toggleTheme.checked;
      const current = loadSettings();
      current.darkTheme = enabled;
      saveSettings(current);
      applyTheme(enabled);
    });
  }

  if (clearDataBtn) {
    clearDataBtn.addEventListener("click", () => {
      // Only clear our small settings object; does not affect anything else.
      localStorage.removeItem("settings");
      if (toggleTheme) toggleTheme.checked = false;
      applyTheme(false);
      alert("Theme settings cleared.");
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThemeControls);
} else {
  initThemeControls();
}

