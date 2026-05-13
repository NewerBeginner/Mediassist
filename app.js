const STORAGE_KEY = "mediassist-html-prototype-v5";
const DAYS = ["\u65e5", "\u4e00", "\u4e8c", "\u4e09", "\u56db", "\u4e94", "\u516d"];
const PALETTE = ["#1f7a5a", "#235d8d", "#b45f06", "#7a3db8", "#b44336", "#59722e", "#0f766e", "#9a3412"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const defaults = {
  settings: {
    viewDate: dateKey(new Date()),
    breakfastTime: "08:30",
    lunchTime: "12:30",
    dinnerTime: "19:00",
    bedtime: "23:30",
    notification: true,
    vibrate: true,
    sound: true,
    lockScreen: true,
    fullScreen: false,
  },
  medicines: [],
  doses: {},
  activeIds: [],
};

let state = loadState();
let editingId = null;
let draft = null;
let delayTargetId = null;
let toastTimer = null;
let calendarExpanded = false;
let calendarCursor = dateFromKey(state.settings.viewDate);

const els = {
  todayLabel: document.querySelector("#todayLabel"),
  dateToggleBtn: document.querySelector("#dateToggleBtn"),
  calendarPanel: document.querySelector("#calendarPanel"),
  weekCalendar: document.querySelector("#weekCalendar"),
  monthCalendar: document.querySelector("#monthCalendar"),
  calendarExpandBtn: document.querySelector("#calendarExpandBtn"),
  calendarYear: document.querySelector("#calendarYear"),
  calendarMonth: document.querySelector("#calendarMonth"),
  prevYearBtn: document.querySelector("#prevYearBtn"),
  prevMonthBtn: document.querySelector("#prevMonthBtn"),
  nextMonthBtn: document.querySelector("#nextMonthBtn"),
  nextYearBtn: document.querySelector("#nextYearBtn"),
  medicineCount: document.querySelector("#medicineCount"),
  doneCount: document.querySelector("#doneCount"),
  pendingCount: document.querySelector("#pendingCount"),
  lateCount: document.querySelector("#lateCount"),
  timeline: document.querySelector("#timeline"),
  activeReminder: document.querySelector("#activeReminder"),
  nextDoseText: document.querySelector("#nextDoseText"),
  medicineSettings: document.querySelector("#medicineSettings"),
  reminderSettings: document.querySelector("#reminderSettings"),
  moreBtn: document.querySelector("#moreBtn"),
  settingsDialog: document.querySelector("#settingsDialog"),
  fabAddBtn: document.querySelector("#fabAddBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  simulateBtn: document.querySelector("#simulateBtn"),
  medicineDialog: document.querySelector("#medicineDialog"),
  medicineDialogTitle: document.querySelector("#medicineDialogTitle"),
  medicineEditor: document.querySelector("#medicineEditor"),
  deleteMedicineBtn: document.querySelector("#deleteMedicineBtn"),
  delayDialog: document.querySelector("#delayDialog"),
  delayTitle: document.querySelector("#delayTitle"),
  toast: document.querySelector("#toast"),
};

function seedMedicines() {
  const today = dateKey(new Date());
  return [
    createMedicine({ id: "med-a", name: "\u836f A", color: "#5b6ee1", startDate: today, bedtimeEnabled: true }),
    createMedicine({ id: "med-b", name: "\u836f B", color: "#1f7a5a", startDate: today, fixedTimes: "08:00, 20:00" }),
    createMedicine({ id: "med-c", name: "\u836f C", color: "#235d8d", startDate: today, fixedTimes: "08:00, 20:00" }),
    createMedicine({
      id: "med-d",
      name: "\u836f D",
      color: "#b45f06",
      startDate: today,
      mealBefore: { breakfast: true, lunch: true, dinner: true },
      bedtimeEnabled: true,
    }),
  ];
}

function createMedicine(overrides = {}) {
  return {
    id: overrides.id || createId(),
    name: overrides.name || "\u65b0\u836f\u54c1",
    color: overrides.color || PALETTE[0],
    doseAmount: overrides.doseAmount || "1 \u7247",
    startDate: overrides.startDate || dateKey(new Date()),
    courseLength: Number(overrides.courseLength) || 14,
    totalCourses: Number(overrides.totalCourses) || 1,
    repeatDays: overrides.repeatDays || [...ALL_DAYS],
    fixedTimes: overrides.fixedTimes || "",
    flexibleTimes: overrides.flexibleTimes || "",
    mealBefore: {
      breakfast: Boolean(overrides.mealBefore?.breakfast),
      lunch: Boolean(overrides.mealBefore?.lunch),
      dinner: Boolean(overrides.mealBefore?.dinner),
    },
    mealBeforeMinutes: Number(overrides.mealBeforeMinutes) || 60,
    bedtimeEnabled: Boolean(overrides.bedtimeEnabled),
  };
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return { ...structuredClone(defaults), medicines: seedMedicines() };
  try {
    const parsed = JSON.parse(stored);
    return {
      ...structuredClone(defaults),
      ...parsed,
      settings: { ...defaults.settings, ...parsed.settings },
      medicines: Array.isArray(parsed.medicines) ? parsed.medicines.map(createMedicine) : seedMedicines(),
    };
  } catch {
    return { ...structuredClone(defaults), medicines: seedMedicines() };
  }
}

function saveState(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (message) showToast(message);
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  toastTimer = setTimeout(() => els.toast.classList.remove("visible"), 1800);
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date) {
  return addDays(date, -date.getDay());
}

function isSameDay(a, b) {
  return dateKey(a) === dateKey(b);
}

function setViewDate(key) {
  state.settings.viewDate = key;
  calendarCursor = dateFromKey(key);
  state.activeIds = [];
  saveState();
  render();
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `med-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function timeToMinutes(time) {
  const [h, m] = normalizeTime(time).split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(total) {
  const value = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function normalizeTime(value) {
  const match = String(value).trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return "00:00";
  return `${String(Math.min(23, Number(match[1]))).padStart(2, "0")}:${match[2]}`;
}

function parseTimes(value) {
  return String(value)
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^(\d{1,2}):([0-5]\d)$/);
      return match ? `${String(Math.min(23, Number(match[1]))).padStart(2, "0")}:${match[2]}` : null;
    })
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

function selectedDay(viewDate = state.settings.viewDate) {
  return dateFromKey(viewDate).getDay();
}

function courseProgress(med, viewDate = state.settings.viewDate) {
  const start = dateFromKey(med.startDate);
  const view = dateFromKey(viewDate);
  const dayCount = Math.round((view - start) / 86400000) + 1;
  const courseLength = Math.max(1, Number(med.courseLength) || 1);
  const totalCourses = Math.max(1, Number(med.totalCourses) || 1);
  const totalDays = courseLength * totalCourses;
  return {
    dayCount,
    totalDays,
    courseNumber: Math.ceil(dayCount / courseLength),
    totalCourses,
    active: dayCount > 0 && dayCount <= totalDays,
    over: dayCount > totalDays,
  };
}

function progressText(med) {
  const p = courseProgress(med);
  if (p.dayCount <= 0) return `\u8ddd\u79bb\u5f00\u59cb\u8fd8\u6709 ${Math.abs(p.dayCount) + 1} \u5929`;
  if (p.over) return `\u5df2\u8d85\u8fc7\u8ba1\u5212\uff1a\u7b2c ${p.dayCount} / ${p.totalDays} \u5929`;
  return `\u7b2c ${p.dayCount} / ${p.totalDays} \u5929 · \u7b2c ${p.courseNumber} / ${p.totalCourses} \u7597\u7a0b`;
}

function buildDoses(viewDate = state.settings.viewDate) {
  const mealTimes = {
    breakfast: state.settings.breakfastTime,
    lunch: state.settings.lunchTime,
    dinner: state.settings.dinnerTime,
  };
  const mealLabels = { breakfast: "\u65e9\u9910\u524d", lunch: "\u5348\u9910\u524d", dinner: "\u665a\u996d\u524d" };
  const doses = [];
  for (const med of state.medicines) {
    if (!courseProgress(med, viewDate).active || !med.repeatDays.includes(selectedDay(viewDate))) continue;
    for (const time of parseTimes(med.fixedTimes)) doses.push(createDose(med, time, "fixed", "\u56fa\u5b9a\u65f6\u95f4", viewDate));
    for (const time of parseTimes(med.flexibleTimes)) doses.push(createDose(med, time, "flexible", "\u975e\u56fa\u5b9a\u65f6\u95f4", viewDate));
    for (const meal of Object.keys(med.mealBefore)) {
      if (!med.mealBefore[meal]) continue;
      const time = minutesToTime(timeToMinutes(mealTimes[meal]) - med.mealBeforeMinutes);
      doses.push(createDose(med, time, `${meal}-before`, `${mealLabels[meal]} ${med.mealBeforeMinutes} \u5206\u949f`, viewDate));
    }
    if (med.bedtimeEnabled) doses.push(createDose(med, state.settings.bedtime, "bedtime", "\u7761\u524d", viewDate));
  }
  return doses
    .map((dose) => ({ ...dose, ...(state.doses[dose.id] || {}) }))
    .sort((a, b) => timeToMinutes(displayTime(a)) - timeToMinutes(displayTime(b)));
}

function createDose(med, time, reason, group, viewDate = state.settings.viewDate) {
  return {
    id: `${viewDate}-${med.id}-${time}-${reason}`,
    medicineId: med.id,
    time,
    reason,
    group,
    status: "pending",
  };
}

function displayTime(dose) {
  return dose.delayedTo || dose.time;
}

function medInfo(id) {
  return state.medicines.find((med) => med.id === id);
}

function isLate(dose) {
  if (state.settings.viewDate !== dateKey(new Date()) || dose.status === "done") return false;
  const now = new Date();
  return timeToMinutes(displayTime(dose)) < now.getHours() * 60 + now.getMinutes();
}

function groupDoses(doses) {
  return doses.reduce((map, dose) => {
    const time = displayTime(dose);
    if (!map.has(time)) map.set(time, []);
    map.get(time).push(dose);
    return map;
  }, new Map());
}

function setDose(id, patch) {
  state.doses[id] = { ...(state.doses[id] || {}), ...patch };
  saveState();
  render();
}

function render() {
  const doses = buildDoses();
  els.todayLabel.textContent = dateFromKey(state.settings.viewDate).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  els.medicineCount.textContent = state.medicines.length;
  els.doneCount.textContent = doses.filter((d) => d.status === "done").length;
  els.pendingCount.textContent = doses.filter((d) => d.status !== "done").length;
  els.lateCount.textContent = doses.filter(isLate).length;
  renderCalendar();
  renderWheelTime("breakfastTime", "\u65e9\u9910", state.settings.breakfastTime);
  renderWheelTime("lunchTime", "\u5348\u9910", state.settings.lunchTime);
  renderWheelTime("dinnerTime", "\u665a\u996d", state.settings.dinnerTime);
  renderWheelTime("bedtime", "\u7761\u524d", state.settings.bedtime);
  renderReminderSettings();
  renderMedicines();
  renderNextDose(doses);
  renderTimeline(doses);
  renderActiveReminder(doses);
}

function renderWheelTime(id, label, value) {
  const host = document.querySelector(`#${id}`);
  const [h, m] = normalizeTime(value).split(":");
  host.className = "time-wheel";
  host.innerHTML = `
    <span>${label}</span>
    <select data-time="${id}" data-part="hour">${Array.from({ length: 24 }, (_, i) => `<option value="${String(i).padStart(2, "0")}" ${String(i).padStart(2, "0") === h ? "selected" : ""}>${String(i).padStart(2, "0")}</option>`).join("")}</select>
    <select data-time="${id}" data-part="minute">${Array.from({ length: 60 }, (_, i) => `<option value="${String(i).padStart(2, "0")}" ${String(i).padStart(2, "0") === m ? "selected" : ""}>${String(i).padStart(2, "0")}</option>`).join("")}</select>
  `;
}

function renderCalendar() {
  if (!els.calendarPanel) return;
  const selected = dateFromKey(state.settings.viewDate);
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  renderCalendarControls();
  renderWeekCalendar(selected);
  renderMonthCalendar(selected);
  els.monthCalendar.hidden = !calendarExpanded;
  els.calendarExpandBtn.classList.toggle("expanded", calendarExpanded);
}

function renderCalendarControls() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  els.calendarYear.innerHTML = Array.from({ length: 21 }, (_, index) => year - 10 + index)
    .map((item) => `<option value="${item}" ${item === year ? "selected" : ""}>${item}年</option>`)
    .join("");
  els.calendarMonth.innerHTML = Array.from({ length: 12 }, (_, index) => index)
    .map((item) => `<option value="${item}" ${item === month ? "selected" : ""}>${item + 1}月</option>`)
    .join("");
}

function renderWeekCalendar(selected) {
  const weekStart = startOfWeek(selected);
  els.weekCalendar.innerHTML = DAYS.map((label, index) => {
    const date = addDays(weekStart, index);
    return calendarDayButton(date, label, selected, true);
  }).join("");
}

function renderMonthCalendar(selected) {
  const first = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  els.monthCalendar.innerHTML = `
    <div class="calendar-weekdays">${DAYS.map((day) => `<span>${day}</span>`).join("")}</div>
    <div class="calendar-month-grid">
      ${cells.map((date) => calendarDayButton(date, "", selected, false)).join("")}
    </div>
  `;
}

function calendarDayButton(date, label, selected, compact) {
  const isSelected = isSameDay(date, selected);
  const isToday = isSameDay(date, new Date());
  const outside = date.getMonth() !== calendarCursor.getMonth();
  const dayKey = dateKey(date);
  const completion = calendarCompletionClass(dayKey);
  return `
    <button
      class="calendar-day ${compact ? "compact" : ""} ${completion} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""} ${outside ? "outside" : ""}"
      data-date="${dayKey}"
      type="button"
    >
      ${label ? `<span>${label}</span>` : ""}
      <strong>${date.getDate()}</strong>
    </button>
  `;
}

function calendarCompletionClass(dayKey) {
  if (dateFromKey(dayKey) >= dateFromKey(dateKey(new Date()))) return "";
  const doses = buildDoses(dayKey);
  if (!doses.length) return "";
  const done = doses.filter((dose) => dose.status === "done").length;
  if (done === doses.length) return "complete";
  if (done / doses.length < 0.5) return "low";
  return "partial";
}

function shiftCalendar(years, months) {
  calendarCursor = new Date(calendarCursor.getFullYear() + years, calendarCursor.getMonth() + months, 1);
  renderCalendar();
}

function renderReminderSettings() {
  const items = [
    ["notification", "\u901a\u77e5\u5f39\u7a97"],
    ["vibrate", "\u9707\u52a8\u63d0\u9192"],
    ["sound", "\u94c3\u58f0\u63d0\u9192"],
    ["lockScreen", "\u9501\u5c4f\u64cd\u4f5c"],
    ["fullScreen", "\u5f3a\u63d0\u9192\u5168\u5c4f"],
  ];
  els.reminderSettings.innerHTML = items
    .map(([key, label]) => `
      <label class="switch-row">
        <span>${label}</span>
        <input data-setting="${key}" type="checkbox" ${state.settings[key] ? "checked" : ""} />
      </label>
    `)
    .join("");
}

function renderMedicines() {
  els.medicineSettings.innerHTML = "";
  for (const med of state.medicines) {
    const card = document.createElement("article");
    card.className = "medicine-card";
    card.style.setProperty("--med-color", med.color);
    card.innerHTML = `
      <div class="medicine-card-header">
        <span class="color-swatch"></span>
        <div class="medicine-title">
          <strong>${escapeHtml(med.name)}</strong>
          <p class="muted">${escapeHtml(med.doseAmount)} · ${escapeHtml(progressText(med))}</p>
        </div>
        <button class="mini-button" data-edit="${med.id}" type="button">\u7f16\u8f91</button>
      </div>
      <p class="rule-summary">${escapeHtml(summaryRules(med))}</p>
    `;
    els.medicineSettings.append(card);
  }
}

function summaryRules(med) {
  const rules = [];
  if (med.fixedTimes) rules.push(`\u56fa\u5b9a ${med.fixedTimes}`);
  if (med.flexibleTimes) rules.push(`\u975e\u56fa\u5b9a ${med.flexibleTimes}`);
  if (med.mealBefore.breakfast) rules.push("\u65e9\u9910\u524d");
  if (med.mealBefore.lunch) rules.push("\u5348\u9910\u524d");
  if (med.mealBefore.dinner) rules.push("\u665a\u996d\u524d");
  if (med.bedtimeEnabled) rules.push("\u7761\u524d");
  return rules.length ? rules.join(" · ") : "\u8fd8\u6ca1\u6709\u8bbe\u7f6e\u63d0\u9192\u65f6\u95f4";
}

function renderNextDose(doses) {
  const next = doses.find((d) => d.status !== "done");
  if (!next) {
    els.nextDoseText.textContent = "\u5f53\u524d\u67e5\u770b\u65e5\u671f\u6ca1\u6709\u5f85\u786e\u8ba4\u63d0\u9192\u3002";
    return;
  }
  const names = doses
    .filter((d) => displayTime(d) === displayTime(next) && d.status !== "done")
    .map((d) => medInfo(d.medicineId)?.name)
    .filter(Boolean)
    .join("\u3001");
  els.nextDoseText.textContent = `\u4e0b\u4e00\u6b21 ${displayTime(next)}\uff1a${names}`;
}

function renderTimeline(doses) {
  els.timeline.innerHTML = "";
  const groups = groupDoses(doses);
  if (!groups.size) {
    els.timeline.innerHTML = `<div class="empty-state timeline-empty">\u8fd9\u4e00\u5929\u6ca1\u6709\u9700\u8981\u63d0\u9192\u7684\u836f\u54c1\u3002\u53ef\u4ee5\u6dfb\u52a0\u65f6\u95f4\u6216\u8c03\u6574\u5faa\u73af\u65e5\u671f\u3002</div>`;
    return;
  }
  for (const [time, group] of groups) {
    const allDone = group.every((d) => d.status === "done");
    const anyLate = group.some(isLate);
    const card = document.createElement("article");
    card.className = "dose-card";
    card.innerHTML = `
      <div class="dose-time">${time}</div>
      <div class="dose-body">
        <div class="dose-title-row">
          <strong>${group.map((d) => medInfo(d.medicineId)?.name).filter(Boolean).join("\u3001")}</strong>
          <span class="tag ${allDone ? "done" : anyLate ? "late" : ""}">${allDone ? "\u5df2\u5b8c\u6210" : anyLate ? "\u903e\u671f\u672a\u786e\u8ba4" : "\u5f85\u786e\u8ba4"}</span>
        </div>
        <div class="med-list">${group.map(renderDoseItem).join("")}</div>
      </div>
    `;
    els.timeline.append(card);
  }
}

function renderDoseItem(dose) {
  const med = medInfo(dose.medicineId);
  if (!med) return "";
  return `
    <div class="med-item ${dose.status}" style="--med-color:${med.color}">
      <button class="med-check" data-done="${dose.id}" type="button">${dose.status === "done" ? "✓" : ""}</button>
      <div>
        <span class="med-name">${escapeHtml(med.name)}</span>
        <span class="med-note">${escapeHtml(med.doseAmount)} · ${escapeHtml(dose.group)}${dose.delayedTo ? `\uff0c\u5df2\u5ef6\u540e\u5230 ${dose.delayedTo}` : ""}</span>
      </div>
      <div class="mini-actions">
        <button class="mini-button" data-done="${dose.id}" type="button">\u786e\u8ba4</button>
        <button class="mini-button warn" data-delay="${dose.id}" type="button">\u5ef6\u540e</button>
      </div>
    </div>
  `;
}

function renderActiveReminder(doses) {
  const active = doses.filter((d) => state.activeIds.includes(d.id) && d.status !== "done");
  if (!active.length) {
    els.activeReminder.className = "active-reminder empty-state";
    els.activeReminder.textContent = "\u8fd8\u6ca1\u6709\u89e6\u53d1\u63d0\u9192\u3002";
    return;
  }
  els.activeReminder.className = "active-reminder";
  els.activeReminder.innerHTML = `<strong>${displayTime(active[0])} \u9700\u8981\u786e\u8ba4</strong><div class="med-list">${active.map(renderDoseItem).join("")}</div>`;
}

function openMedicineDialog(med) {
  editingId = med?.id || null;
  draft = structuredClone(
    med || createMedicine({ name: `\u65b0\u836f\u54c1 ${state.medicines.length + 1}`, fixedTimes: "08:00", color: PALETTE[state.medicines.length % PALETTE.length] }),
  );
  els.medicineDialogTitle.textContent = editingId ? "\u7f16\u8f91\u836f\u54c1" : "\u6dfb\u52a0\u836f\u54c1";
  els.deleteMedicineBtn.hidden = !editingId;
  renderMedicineEditor();
  els.medicineDialog.showModal();
}

function renderMedicineEditor() {
  els.medicineEditor.innerHTML = `
    <div class="form-grid editor-grid">
      ${field("name", "\u540d\u79f0", "text", draft.name)}
      ${field("doseAmount", "\u7528\u91cf", "text", draft.doseAmount)}
      ${field("startDate", "\u5f00\u59cb\u65e5\u671f", "date", draft.startDate)}
      ${field("courseLength", "\u6bcf\u7597\u7a0b\u5929\u6570", "number", draft.courseLength)}
      ${field("totalCourses", "\u7597\u7a0b\u6570", "number", draft.totalCourses)}
      ${field("fixedTimes", "\u56fa\u5b9a\u65f6\u95f4", "text", draft.fixedTimes, "08:00, 20:00")}
      ${field("flexibleTimes", "\u975e\u56fa\u5b9a\u65f6\u95f4", "text", draft.flexibleTimes, "\u4eca\u5929\u4e34\u65f6 16:30")}
      ${field("mealBeforeMinutes", "\u996d\u524d\u63d0\u524d\u5206\u949f", "number", draft.mealBeforeMinutes)}
    </div>
    <div>
      <p class="repeat-title">\u989c\u8272</p>
      <div class="palette">${PALETTE.map((color) => `<button class="palette-dot ${draft.color === color ? "selected" : ""}" data-color="${color}" style="--dot:${color}" type="button"></button>`).join("")}</div>
    </div>
    <div class="option-row">
      ${check("breakfast", "\u65e9\u9910\u524d", draft.mealBefore.breakfast)}
      ${check("lunch", "\u5348\u9910\u524d", draft.mealBefore.lunch)}
      ${check("dinner", "\u665a\u996d\u524d", draft.mealBefore.dinner)}
      ${check("bedtimeEnabled", "\u7761\u524d", draft.bedtimeEnabled)}
    </div>
    <div class="repeat-days"><span class="repeat-title">\u5faa\u73af\u65e5\u671f</span>${DAYS.map((d, i) => `<button class="day-chip ${draft.repeatDays.includes(i) ? "selected" : ""}" data-day="${i}" type="button">${d}</button>`).join("")}</div>
  `;
}

function field(key, label, type, value, placeholder = "") {
  return `<label>${label}<input data-field="${key}" type="${type}" value="${escapeHtml(String(value ?? ""))}" placeholder="${placeholder}" min="1" /></label>`;
}

function check(key, label, checked) {
  return `<label class="check-option"><input data-check="${key}" type="checkbox" ${checked ? "checked" : ""} /><span>${label}</span></label>`;
}

function saveDraft() {
  const med = createMedicine(draft);
  if (editingId) state.medicines = state.medicines.map((m) => (m.id === editingId ? med : m));
  else state.medicines.push(med);
  saveState("\u5df2\u4fdd\u5b58");
  render();
}

function deleteEditing() {
  if (!editingId) return;
  state.medicines = state.medicines.filter((m) => m.id !== editingId);
  for (const key of Object.keys(state.doses)) if (key.includes(`-${editingId}-`)) delete state.doses[key];
  state.activeIds = state.activeIds.filter((id) => !id.includes(`-${editingId}-`));
  saveState("\u5df2\u5220\u9664");
  render();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
}

function bindEvents() {
  els.dateToggleBtn.addEventListener("click", () => {
    els.calendarPanel.hidden = !els.calendarPanel.hidden;
    calendarCursor = dateFromKey(state.settings.viewDate);
    renderCalendar();
  });
  els.calendarExpandBtn.addEventListener("click", () => {
    calendarExpanded = !calendarExpanded;
    renderCalendar();
  });
  els.prevYearBtn.addEventListener("click", () => shiftCalendar(-1, 0));
  els.nextYearBtn.addEventListener("click", () => shiftCalendar(1, 0));
  els.prevMonthBtn.addEventListener("click", () => shiftCalendar(0, -1));
  els.nextMonthBtn.addEventListener("click", () => shiftCalendar(0, 1));
  els.calendarYear.addEventListener("change", () => {
    calendarCursor = new Date(Number(els.calendarYear.value), calendarCursor.getMonth(), 1);
    renderCalendar();
  });
  els.calendarMonth.addEventListener("change", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), Number(els.calendarMonth.value), 1);
    renderCalendar();
  });
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.time) {
      const current = normalizeTime(state.settings[target.dataset.time]);
      const [h, m] = current.split(":");
      state.settings[target.dataset.time] = target.dataset.part === "hour" ? `${target.value}:${m}` : `${h}:${target.value}`;
      saveState();
      render();
    }
    if (target.dataset.setting) {
      state.settings[target.dataset.setting] = target.checked;
      saveState();
    }
    if (target.dataset.field && draft) {
      const key = target.dataset.field;
      draft[key] = ["courseLength", "totalCourses", "mealBeforeMinutes"].includes(key)
        ? Math.max(1, Number(target.value) || 1)
        : target.value;
    }
    if (target.dataset.check && draft) {
      const key = target.dataset.check;
      if (key === "bedtimeEnabled") draft.bedtimeEnabled = target.checked;
      else draft.mealBefore[key] = target.checked;
    }
  });
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (target.closest("[data-date]")) {
      setViewDate(target.closest("[data-date]").dataset.date);
    }
    if (target.dataset.edit) openMedicineDialog(state.medicines.find((m) => m.id === target.dataset.edit));
    if (target.dataset.done) setDose(target.dataset.done, { status: "done" });
    if (target.dataset.delay) {
      delayTargetId = target.dataset.delay;
      const dose = buildDoses().find((d) => d.id === delayTargetId);
      els.delayTitle.textContent = `\u5ef6\u540e ${medInfo(dose?.medicineId)?.name || "\u836f\u54c1"}`;
      els.delayDialog.showModal();
    }
    if (target.dataset.color && draft) {
      draft.color = target.dataset.color;
      renderMedicineEditor();
    }
    if (target.dataset.day && draft) {
      const day = Number(target.dataset.day);
      draft.repeatDays = draft.repeatDays.includes(day)
        ? draft.repeatDays.filter((d) => d !== day)
        : [...draft.repeatDays, day].sort((a, b) => a - b);
      renderMedicineEditor();
    }
  });
  els.fabAddBtn.addEventListener("click", () => openMedicineDialog(null));
  els.moreBtn.addEventListener("click", () => els.settingsDialog.showModal());
  els.resetBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    state = loadState();
    render();
    showToast("\u5df2\u91cd\u7f6e");
  });
  els.simulateBtn.addEventListener("click", () => {
    const doses = buildDoses();
    const next = doses.find((d) => d.status !== "done");
    if (!next) return;
    state.activeIds = doses.filter((d) => displayTime(d) === displayTime(next) && d.status !== "done").map((d) => d.id);
    saveState();
    render();
  });
  els.medicineDialog.addEventListener("close", () => {
    if (els.medicineDialog.returnValue === "save") saveDraft();
    if (els.medicineDialog.returnValue === "delete") deleteEditing();
  });
  els.delayDialog.addEventListener("close", () => {
    if (!delayTargetId || els.delayDialog.returnValue === "cancel") return;
    const dose = buildDoses().find((d) => d.id === delayTargetId);
    const minutes = Number(els.delayDialog.returnValue);
    if (dose && minutes) setDose(delayTargetId, { status: "delayed", delayedTo: minutesToTime(timeToMinutes(displayTime(dose)) + minutes) });
    delayTargetId = null;
  });
}

bindEvents();
render();
