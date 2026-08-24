const CONFIG_PATH = "config.json";
const VERSION = "0.14.6";
const BUILD = btoa(VERSION).replace(/[^a-z0-9]/gi, "").slice(0, 8).padEnd(8, "0");
const STORAGE_KEY = "nutPVE.dashboard.settings";
console.log("hello! :^)")
console.log("nutpve", VERSION, BUILD);
const $ = (selector) => document.querySelector(selector);

const terminal = $(".terminal");
const form = $("#command-form");
const input = $("#command-input");
const commandFeedback = $("#command-feedback");
const serviceList = $("#service-list");
const liveTime = $("#live-time");
const epochTime = $("#epoch-time");
const timeWeekday = $("#time-weekday");
const timeMonth = $("#time-month");
const timeDay = $("#time-day");
const timeHour = $("#time-hour");
const timeMinute = $("#time-minute");
const timeSecond = $("#time-second");
const timePeriod = $("#time-period");
const settings = $("#settings");
const settingsToggle = $("#settings-toggle");
const settingsMenu = $("#settings-menu");
const ipMap = $("#ip-map");
const ipMapToggle = $("#ip-map-toggle");
const ipMapMenu = $("#ip-map-menu");
const debugStatusToggle = $("#debug-status-toggle");
const debugTimeToggle = $("#debug-time-toggle");
const debugTermToggle = $("#debug-term-toggle");
const debugThemePrev = $("#debug-theme-prev");
const debugThemeNext = $("#debug-theme-next");
const debugThemeName = $("#debug-theme-name");
const debugBootToggle = $("#debug-boot-toggle");
const debugReloadConfig = $("#debug-reload-config");
const debugResetSettings = $("#debug-reset-settings");
const debugReloadPage = $("#debug-reload-page");
const debugVersion = $("#debug-version");
const menuBackdrop = $("#menu-backdrop");
const landingOverlay = $("#landing-overlay");
const landingStart = $("#landing-start");
const autobootToggle = $("#autoboot-toggle");
const bootOverlay = $("#boot-overlay");
const bootLines = $("#boot-lines");
const statusToggle = $("#status-toggle");
const timeToggle = $("#time-toggle");
const termToggle = $("#term-toggle");
const themePicker = $("#theme-picker");
const themePickerToggle = $("#theme-picker-toggle");
const themePickerMenu = $("#theme-picker-menu");
const themePrev = $("#theme-prev");
const themeNext = $("#theme-next");
const aboutOs = $("#about-os");
const aboutTheme = $("#about-theme");
const aboutThemeSwatch = $("#about-theme-swatch");
const aboutServices = $("#about-services");
const footerButton = $("#footer-button");
const footerPopup = $("#footer-popup");
const footerPopupBackdrop = $("#footer-popup-backdrop");
const themeRequestMessage = $("#theme-request-message");
const starsToggle = $("#stars-toggle");

let THEMES = {};
let IP_MAP = [];
let SERVICES = [];
let SECTIONS = [];

const savedSettings = (() => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
})();

const boolSetting = (key, fallback = true) =>
  typeof savedSettings[key] === "boolean" ? savedSettings[key] : fallback;

statusToggle.checked = boolSetting("checkStatus");
timeToggle.checked = boolSetting("time");
termToggle.checked = boolSetting("term");
starsToggle.checked = boolSetting("stars");
setStarsEnabled(starsToggle.checked);
autobootToggle.checked = boolSetting("autoboot", false);

let selectedTheme = "dark";
let previousTheme = selectedTheme;
let activeService = null;
let isTyping = false;
let termEnabled = termToggle.checked;
let statusChecksEnabled = statusToggle.checked;
let timeEnabled = timeToggle.checked;
let timeInterval = null;
let commandFeedbackTimeout = null;
let hoverClearTimeout = null;
let themeRequestTimeout = null;
let bootTimer = null;
let bootSkipHandler = null;
let resizeTimer = null;
const statusRequests = new Map();

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      checkStatus: statusToggle.checked,
      time: timeToggle.checked,
      term: termToggle.checked,
      stars: starsToggle.checked,
      boot: debugBootToggle.checked,
      autoboot: autobootToggle.checked,
      theme: selectedTheme,
    }));
  } catch {
  }
}

function updateMenuBackdrop() {
  settings.classList.toggle("menu-is-open", !settingsMenu.hidden);
  ipMap.classList.toggle("menu-is-open", !ipMapMenu.hidden);
  menuBackdrop.hidden = settingsMenu.hidden && ipMapMenu.hidden;
}

function bindMenuToggle(button, menu, otherMenu) {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = menu.hidden;
    menu.hidden = !open;
    if (open) otherMenu.hidden = true;
    updateMenuBackdrop();
  });
}

bindMenuToggle(settingsToggle, settingsMenu, ipMapMenu);
bindMenuToggle(ipMapToggle, ipMapMenu, settingsMenu);

document.addEventListener("click", (event) => {
  if (!settings.contains(event.target)) settingsMenu.hidden = true;
  if (!ipMap.contains(event.target)) ipMapMenu.hidden = true;
  if (!themePicker.contains(event.target)) themePickerMenu.hidden = true;
  updateMenuBackdrop();
});

const normalise = (value) => value.trim().toLocaleLowerCase().replace(/-/g, " ");
const serviceSearchText = (service) => [service.name, ...(service.aliases || [])].map(normalise);
const commandServiceName = (service) => service.name.trim().replace(/\s+/g, "-");

function findServices(query) {
  const search = normalise(query);
  return search
    ? SERVICES.filter((service) => serviceSearchText(service).some((term) => term.includes(search)))
    : [];
}

async function copyText(text, button) {
  let copied = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch {
  }

  if (!copied) {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.left = "-9999px";
    document.body.append(helper);
    helper.select();
    try {
      copied = document.execCommand("copy");
    } catch {
    }
    helper.remove();
  }

  if (copied && button) {
    button.classList.add("is-copied");
    setTimeout(() => button.classList.remove("is-copied"), 900);
  }
}

function renderIpMap() {
  ipMapMenu.replaceChildren(...IP_MAP.map(({ hostname, ip }) => {
    const row = document.createElement("div");
    const host = document.createElement("span");
    const address = document.createElement("button");

    row.className = "ip-map-row";
    host.className = "ip-map-hostname";
    host.textContent = hostname;

    address.className = "ip-map-address";
    address.type = "button";
    address.textContent = ip;
    address.addEventListener("click", () => copyText(ip, address));

    row.append(host, address);
    return row;
  }));
}

function showCommandFeedback(message) {
  commandFeedback.textContent = message;
  commandFeedback.hidden = false;
  clearTimeout(commandFeedbackTimeout);
  commandFeedbackTimeout = setTimeout(() => {
    commandFeedback.hidden = true;
  }, 3000);
}

function createServiceElement(service, index) {
  const button = document.createElement("button");
  const copy = document.createElement("span");
  const heading = document.createElement("span");
  const name = document.createElement("span");
  const status = document.createElement("span");

  button.className = "service";
  button.type = "button";
  button.dataset.serviceIndex = String(index);
  button.addEventListener("mouseenter", () => selectFromHover(service));
  button.addEventListener("focus", () => selectFromHover(service));
  button.addEventListener("mouseleave", clearHoverSelection);
  button.addEventListener("blur", clearHoverSelection);
  button.addEventListener("click", () => openService(service));

  copy.className = "service-copy";
  heading.className = "service-heading";

  if (service.icon) {
    const icon = document.createElement("img");
    icon.className = "service-icon";
    icon.src = service.icon;
    icon.addEventListener("error", () => icon.remove());
    heading.append(icon);
  }

  name.className = "service-name";
  name.textContent = service.name;

  status.className = "status";

  heading.append(name, status);
  copy.append(heading);

  if (service.url) {
    const url = document.createElement("span");
    url.className = "service-url";
    url.textContent = service.description || "";
    copy.append(url);
  }

  button.append(copy);
  return button;
}

function gridColumnCount() {
  const style = getComputedStyle(terminal);
  const width = terminal.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const fontSize = parseFloat(getComputedStyle(document.body).fontSize);
  const minWidth = (window.matchMedia("(max-width: 700px)").matches ? 10.5 : 12) * fontSize;
  return Math.max(1, Math.floor(width / minWidth));
}

function renderServices() {
  serviceList.replaceChildren();

  const sections = SECTIONS.length ? SECTIONS : [{ id: 1, title: "" }];
  const columnCount = gridColumnCount();

  sections.forEach((section) => {
    const block = document.createElement("div");
    const toggle = document.createElement("button");
    const arrow = document.createElement("span");
    const title = document.createElement("span");
    const grid = document.createElement("div");

    block.className = "service-section";
    block.dataset.sectionId = String(section.id);

    toggle.type = "button";
    toggle.className = "section-toggle";
    arrow.className = "section-arrow";
    arrow.textContent = "▽";
    title.className = "section-title";
    title.textContent = section.title || "";
    toggle.append(arrow, title);
    toggle.addEventListener("click", () => {
      block.classList.toggle("is-collapsed");
      arrow.textContent = block.classList.contains("is-collapsed") ? ">" : "▽";
    });

    grid.className = "section-grid";
    const columns = Array.from({ length: columnCount }, () => {
      const column = document.createElement("div");
      column.className = "section-column";
      grid.append(column);
      return column;
    });

    SERVICES
      .map((service, index) => ({ service, index }))
      .filter(({ service }) => Number(service.section || 1) === Number(section.id))
      .forEach(({ service, index }, position) => {
        columns[position % columnCount].append(createServiceElement(service, index));
      });

    block.append(toggle, grid);
    serviceList.append(block);
  });

  updateSelection();
}

function updateCommand() {
  input.style.width = `${Math.max(input.value.length + 1, 2)}ch`;
  const cursorPosition = document.activeElement === input
    ? (input.selectionStart ?? input.value.length)
    : input.value.length;
  input.style.setProperty("--cursor-position", `${cursorPosition}ch`);
}

function applySelection(active) {
  document.querySelectorAll(".service").forEach((element) => {
    const service = SERVICES[Number(element.dataset.serviceIndex)];
    const isActive = service === active;
    element.classList.toggle("is-active", isActive);
    const subtitle = element.querySelector(".service-url");
    if (subtitle) {
      subtitle.textContent = isActive
        ? service.url.replace(/^https?:\/\//i, "")
        : service.description || "";
    }
  });
}

function updateSelection() {
  const query = input.value.trimStart().replace(/^\.\//, "");
  const matches = findServices(query);
  activeService = query
    ? (activeService && matches.includes(activeService) ? activeService : matches[0] || null)
    : null;
  serviceList.classList.toggle("has-query", Boolean(query) || !termEnabled);
  applySelection(activeService);
  updateCommand();
}

function setCommand(value, animate = false) {
  const changed = input.value !== value;
  input.value = value;
  input.setSelectionRange(value.length, value.length);
  isTyping = false;
  updateSelection();
  if (animate && changed) {
    input.classList.remove("is-changing");
    void input.offsetWidth;
    input.classList.add("is-changing");
  }
}

function focusInput() {
  const scrollY = window.scrollY;
  input.focus({ preventScroll: true });
  if (Math.abs(window.scrollY - scrollY) > 2) window.scrollTo(0, scrollY);
}

function selectFromHover(service) {
  clearTimeout(hoverClearTimeout);
  if (!termEnabled) {
    activeService = service;
    applySelection(service);
    return;
  }
  const scrollY = window.scrollY;
  const restoreFocus = document.activeElement === input;
  if (restoreFocus) input.blur();
  setCommand(`./${commandServiceName(service)}`, true);
  requestAnimationFrame(() => {
    if (restoreFocus) focusInput();
    if (Math.abs(window.scrollY - scrollY) > 2) window.scrollTo(0, scrollY);
  });
}

function clearHoverSelection() {
  clearTimeout(hoverClearTimeout);
  if (!termEnabled) {
    activeService = null;
    applySelection(null);
    return;
  }
  if (!isTyping) {
    hoverClearTimeout = setTimeout(() => setCommand("", true), 80);
  }
}

function cycleSelection(direction) {
  const matches = findServices(input.value.trimStart().replace(/^\.\//, ""));
  if (!matches.length) return;
  const current = Math.max(0, matches.indexOf(activeService));
  const next = matches[(current + direction + matches.length) % matches.length];
  activeService = next;
  input.value = `./${commandServiceName(next)}`;
  input.setSelectionRange(input.value.length, input.value.length);
  updateSelection();
}

function tabComplete() {
  const query = input.value.trimStart().replace(/^\.\//, "");
  const candidates = findServices(query).map((service) => `./${commandServiceName(service)}`);
  if (!candidates.length) return;
  const current = input.value.trimStart().toLocaleLowerCase();
  const exact = candidates.findIndex((candidate) => candidate.toLocaleLowerCase() === current);
  const next = candidates[(exact >= 0 ? exact + 1 : 0) % candidates.length];
  setCommand(next, true);
}

function openService(service) {
  if (service?.url) window.location.assign(service.url);
}

async function checkStatus(service) {
  if (!statusChecksEnabled) return;

  const status = document.querySelector(`[data-status-for="${CSS.escape(service.name)}"]`);
  if (!status) return;

  const previous = statusRequests.get(service);
  if (previous) previous.controller.abort();

  status.classList.remove("is-online", "is-offline");

  const controller = new AbortController();
  const request = { controller, timeout: setTimeout(() => controller.abort(), 5000) };
  statusRequests.set(service, request);

  try {
    await fetch(service.url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    if (statusChecksEnabled && statusRequests.get(service) === request) {
      status.classList.add("is-online");
    }
  } catch {
    if (statusChecksEnabled && statusRequests.get(service) === request) {
      status.classList.add("is-offline");
    }
  } finally {
    clearTimeout(request.timeout);
    if (statusRequests.get(service) === request) statusRequests.delete(service);
    updateaboutServiceCount();
  }
}

function setStatusChecksEnabled(enabled) {
  statusChecksEnabled = enabled;
  document.querySelectorAll(".status").forEach((status) => {
    status.hidden = !enabled;
  });
  if (!enabled) {
    statusRequests.forEach(({ controller, timeout }) => {
      controller.abort();
      clearTimeout(timeout);
    });
    statusRequests.clear();
    return;
  }
  SERVICES.forEach(checkStatus);
}

function setStarsEnabled(enabled) {
  document.body.classList.toggle("stars-off", !enabled);
}

function updateTime() {
  if (!timeEnabled) return;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Halifax",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(new Date());
  const getPart = (type) => parts.find((part) => part.type === type)?.value || "";

  timeWeekday.textContent = getPart("weekday");
  timeMonth.textContent = getPart("month");
  timeDay.textContent = getPart("day");
  timeHour.textContent = getPart("hour").padStart(2, "0");
  timeMinute.textContent = getPart("minute");
  timeSecond.textContent = getPart("second");
  timePeriod.textContent = getPart("dayPeriod").toLocaleLowerCase();
}

function setTermEnabled(enabled) {
  termEnabled = enabled;
  input.disabled = !enabled;
  terminal.classList.toggle("term-off", !enabled);
  if (enabled) {
    setCommand("");
  } else {
    serviceList.classList.add("has-query");
    if (document.activeElement === input) input.blur();
  }
}

function setTimeEnabled(enabled) {
  timeEnabled = enabled;
  liveTime.hidden = !enabled;
  epochTime.hidden = enabled;
  clearInterval(timeInterval);
  timeInterval = null;
  if (enabled) {
    updateTime();
    timeInterval = setInterval(updateTime, 1000);
  }
}

function updateaboutServiceCount() {
  if (!statusChecksEnabled) {
    aboutServices.textContent = "n/a";
    return;
  }
  const online = document.querySelectorAll(".status.is-online").length;
  aboutServices.textContent = `${online}/${SERVICES.length} online`;
}

const themeStyle = document.createElement("style");
document.head.append(themeStyle);
const appliedTokens = new Set();

function themeSwatch(colors) {
  const swatch = document.createElement("span");
  swatch.className = "theme-swatch";
  ["background", "white", "grey", "green", "red"].forEach((name) => {
    const square = document.createElement("i");
    square.style.background = colors[name];
    swatch.append(square);
  });
  return swatch;
}

function applyTheme() {
  const theme = THEMES[selectedTheme];
  document.body.dataset.theme = selectedTheme;
  appliedTokens.forEach((name) => document.body.style.removeProperty(`--${name}`));
  appliedTokens.clear();
  Object.entries(theme.colors || {}).forEach(([name, value]) => {
    document.body.style.setProperty(`--${name}`, value);
    appliedTokens.add(name);
  });
  themeStyle.textContent = theme.css || "";
  aboutTheme.textContent = theme.label;
  aboutThemeSwatch.replaceChildren(themeSwatch(theme.colors));
}

function refreshThemeUI() {
  themePickerToggle.textContent = THEMES[selectedTheme].label;
  debugThemeName.textContent = THEMES[selectedTheme].label;
  themePickerMenu.hidden = true;
  applyTheme();
}

function selectTheme(value) {
  selectedTheme = value;
  previousTheme = value;
  refreshThemeUI();
  saveSettings();
}

function cycleTheme(direction) {
  const keys = Object.keys(THEMES);
  if (!keys.length) return;
  const index = keys.indexOf(selectedTheme);
  selectTheme(keys[(index + direction + keys.length) % keys.length]);
}

function populateThemes() {
  const rows = Object.entries(THEMES).map(([value, theme]) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "theme-picker-row";
    row.append(themeSwatch(theme.colors), document.createTextNode(theme.label));
    row.addEventListener("click", () => selectTheme(value));
    return row;
  });

  const requestRow = document.createElement("button");
  requestRow.type = "button";
  requestRow.className = "theme-picker-row theme-picker-row--request";
  requestRow.textContent = "request theme...";
  requestRow.addEventListener("click", () => {
    selectedTheme = previousTheme;
    refreshThemeUI();
    showThemeRequest();
    saveSettings();
  });

  themePickerMenu.replaceChildren(...rows, requestRow);
}

function showThemeRequest() {
  themeRequestMessage.hidden = false;
  clearTimeout(themeRequestTimeout);
  themeRequestTimeout = setTimeout(() => {
    themeRequestMessage.hidden = true;
  }, 800);
}

function renderabout() {
  aboutOs.textContent = `nutpve v${VERSION} (${BUILD})`;
  aboutTheme.textContent = THEMES[selectedTheme]?.label || selectedTheme;
  aboutThemeSwatch.replaceChildren(themeSwatch(THEMES[selectedTheme].colors));
  updateaboutServiceCount();
}

function openFooterPopup() {
  renderabout();
  footerPopupBackdrop.hidden = false;
  footerPopup.hidden = false;
}

function closeFooterPopup() {
  footerPopupBackdrop.hidden = true;
  footerPopup.hidden = true;
}

function finishBoot() {
  bootOverlay.classList.add("is-done");
  terminal.classList.remove("is-booting");
  if (bootSkipHandler) {
    document.removeEventListener("click", bootSkipHandler);
    document.removeEventListener("keydown", bootSkipHandler);
    bootSkipHandler = null;
  }
}

function showLanding() {
  terminal.classList.add("is-landing");
  landingOverlay.classList.remove("is-done");
  landingStart.focus({ preventScroll: true });
}

function hideLanding() {
  terminal.classList.remove("is-landing");
  landingOverlay.classList.add("is-done");
}

landingStart.addEventListener("click", (event) => {
  event.stopPropagation();
  hideLanding();
  startBoot();
  focusInput();
});

autobootToggle.addEventListener("change", saveSettings);

function init() {
  if (autobootToggle.checked) {
    hideLanding();
    runBoot();
  } else {
    showLanding();
  }

  document.body.classList.remove("nut-loading");
}

function startBoot() {
  const textLines = [
    `nutpve ${VERSION}`,
    "",
    "[  OK  ] Started Journal Service.",
    "[  OK  ] Mounted /dev/nut0 on /.",
    "[  OK  ] Started Network Time Syncronization.",
    "[  OK  ] Reached target Network.",
    "[  OK  ] Started Dashboard Session.",
    "[  OK  ] Reached target HTTP/3.",
    "",
    "Serving HTTPS on :: port 443 (https://[::]:443/) ...",
  ];

  const fragments = textLines.map((text) => {
    const line = document.createElement("p");
    line.className = "boot-line";
    const ok = text.match(/^\[  OK  \]/);
    if (ok) {
      const label = document.createElement("span");
      label.className = "boot-ok";
      label.textContent = ok[0];
      line.append(label, document.createTextNode(text.slice(ok[0].length)));
    } else {
      line.textContent = text;
    }
    return line;
  });

  let index = 0;
  let done = false;

  function revealLine() {
    if (done) return;
    if (index < fragments.length) {
      bootLines.append(fragments[index]);
      index += 1;
      bootTimer = setTimeout(revealLine, 50);
    } else {
      done = true;
      setTimeout(finishBoot, 50);
    }
  }

  bootSkipHandler = () => {
    if (done) return;
    done = true;
    clearTimeout(bootTimer);
    fragments.forEach((fragment) => bootLines.append(fragment));
    setTimeout(finishBoot, 100);
  };

  document.addEventListener("click", bootSkipHandler);
  document.addEventListener("keydown", bootSkipHandler);
  terminal.classList.add("is-booting");
  revealLine();
}

function runBoot() {
  if (debugBootToggle.checked) startBoot();
  else finishBoot();
}

function syncDebugToggles() {
  debugStatusToggle.checked = statusToggle.checked;
  debugTimeToggle.checked = timeToggle.checked;
  debugTermToggle.checked = termToggle.checked;
}

const settingPairs = [
  [statusToggle, setStatusChecksEnabled],
  [timeToggle, setTimeEnabled],
  [termToggle, setTermEnabled],
  [starsToggle, setStarsEnabled],
];

settingPairs.forEach(([toggle, apply]) => {
  toggle.addEventListener("change", () => {
    apply(toggle.checked);
    syncDebugToggles();
    saveSettings();
  });
});

const debugPairs = [
  [debugStatusToggle, statusToggle, setStatusChecksEnabled],
  [debugTimeToggle, timeToggle, setTimeEnabled],
  [debugTermToggle, termToggle, setTermEnabled],
];

debugPairs.forEach(([debugToggle, mainToggle, apply]) => {
  debugToggle.addEventListener("change", () => {
    mainToggle.checked = debugToggle.checked;
    apply(mainToggle.checked);
    saveSettings();
  });
});

debugBootToggle.addEventListener("change", saveSettings);

const debugActions = [
  [debugReloadConfig, () => loadConfig()],
  [debugResetSettings, () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }],
  [debugReloadPage, () => window.location.reload()],
];

debugActions.forEach(([button, action]) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    action();
  });
});

[[debugThemePrev, -1], [debugThemeNext, 1], [themePrev, -1], [themeNext, 1]].forEach(([button, direction]) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    cycleTheme(direction);
  });
});

themePickerToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  themePickerMenu.hidden = !themePickerMenu.hidden;
});

footerButton.addEventListener("click", (event) => {
  event.stopPropagation();
  if (footerPopup.hidden) openFooterPopup();
  else closeFooterPopup();
});

footerPopup.addEventListener("click", closeFooterPopup);
footerPopupBackdrop.addEventListener("click", closeFooterPopup);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = input.value.trimStart().replace(/^\.\//, "");
  if (!query) return;

  const service = activeService || findServices(query)[0];
  if (service) {
    openService(service);
  } else {
    showCommandFeedback(`nut: no such app: ./${query}`);
    setCommand("");
  }
});

input.addEventListener("focus", () => {
  input.setSelectionRange(input.value.length, input.value.length);
  updateCommand();
});

input.addEventListener("click", updateCommand);
input.addEventListener("keyup", updateCommand);

$(".login-info").addEventListener("click", focusInput);

input.addEventListener("input", () => {
  isTyping = true;

  const value = input.value.trimStart();
  if (value && !/^\.\//.test(value)) {
    input.value = `./${value.replace(/^\.+/, "").replace(/^\/+/, "")}`;
    input.setSelectionRange(input.value.length, input.value.length);
  }

  updateSelection();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    tabComplete();
    return;
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    cycleSelection(event.key === "ArrowDown" ? 1 : -1);
  }

  if (event.key === "Escape") {
    setCommand("");
    isTyping = false;
  }
});

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderServices, 150);
});

async function loadConfig() {
  const response = await fetch(CONFIG_PATH);
  if (!response.ok) throw new Error(`Could not load ${CONFIG_PATH}`);

  const config = await response.json();
  THEMES = config.themes || {};
  IP_MAP = config.ipMap || [];
  SERVICES = config.services || [];
  SECTIONS = config.sections || [];

  selectedTheme = Object.hasOwn(THEMES, savedSettings.theme)
    ? savedSettings.theme
    : "dark";
  previousTheme = selectedTheme;

  populateThemes();
  refreshThemeUI();
  syncDebugToggles();
  debugBootToggle.checked = savedSettings.boot !== false;
  debugVersion.textContent = `v${VERSION} (${BUILD})`;
  renderIpMap();
  renderServices();
  setStatusChecksEnabled(statusToggle.checked);
  setTimeEnabled(timeToggle.checked);
  setTermEnabled(termToggle.checked);
  setStarsEnabled(starsToggle.checked);
  renderabout();
}

footerButton.textContent = `✧ nutpve v${VERSION}`;

loadConfig()
  .then(init)
  .catch((error) => {
    console.error(error);
    init();
  });

if (autobootToggle.checked && termToggle.checked && window.matchMedia("(pointer: fine)").matches) {
  requestAnimationFrame(focusInput);
}
