const STORAGE_KEY = "mediassist-html-prototype-v4";
const DAYS = ["日", "一", "二", "三", "四", "五", "六"];
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

const els = {
  todayLabel: document.querySelector("#todayLabel"),
  medicineCount: document.querySelector("#medicineCount"),
  doneCount: document.querySelector("#doneCount"),
  pendingCount: document.querySelector("#pendingCount"),
  lateCount: document.querySelector("#lateCount"),
  viewDate: document.querySelector("#viewDate"),
  timeline: document.querySelector("#timeline"),
  activeReminder: document.querySelector("#activeReminder"),
  nextDoseText: document.querySelector("#nextDoseText"),
  medicineSettings: document.querySelector("#medicineSettings"),
  reminderSettings: document.querySelector("#reminderSettings"),
  addMedicineBtn: document.querySelector("#addMedicineBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  simulateBtn: document.querySelector("#simulateBtn"),
  medicineDialog: document.querySelector("#medicineDialog"),
  medicineDialogTitle: document.querySelector("#medicineDialogTitle"),
  medicineEditor: document.querySelector("#medicineEditor"),
  deleteMedicineBtn: document.querySelector("#deleteMedicineBtn"),
  delayDialog: document.querySelector("#delayDialog"),
  delayTitle: document.querySelector("#delayTitle"),
};

function seedMedicines() {
  const today = dateKey(new Date());
  return [
    createMedicine({ id: "med-a", name: "药 A", color: "#5b6ee1", startDate: today, bedtimeEnabled: true }),
    createMedicine({ id: "med-b", name: "药 B", color: "#1f7a5a", startDate: today, fixedTimes: "08:00, 20:00" }),
    createMedicine({ id: "med-c", name: "药 C", color: "#235d8d", startDate: today, fixedTimes: "08:00, 20:00" }),
    createMedicine({
      id: "med-d",
      name: "药 D",
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
    name: overrides.name || "新药品",
    color: overrides.color || PALETTE[0],
    doseAmount: overrides.doseAmount || "1 片",
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

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
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

function selectedDay() {
  return dateFromKey(state.settings.viewDate).getDay();
}

function courseProgress(med) {
  const start = dateFromKey(med.startDate);
  const view = dateFromKey(state.settings.viewDate);
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
  if (p.dayCount <= 0) return `距离开始还有 ${Math.abs(p.dayCount) + 1} 天`;
  if (p.over) return `已超过计划：第 ${p.dayCount} / ${p.totalDays} 天`;
  return `第 ${p.dayCount} / ${p.totalDays} 天 · 第 ${p.courseNumber} / ${p.totalCourses} 疗程`;
}

function buildDoses() {
  const mealTimes = {
    breakfast: state.settings.breakfastTime,
    lunch: state.settings.lunchTime,
    dinner: state.settings.dinnerTime,
  };
  const mealLabels = { breakfast: "早餐前", lunch: "午餐前", dinner: "晚饭前" };
  const doses = [];
  for (const med of state.medicines) {
    if (!courseProgress(med).active || !med.repeatDays.includes(selectedDay())) continue;
    for (const time of parseTimes(med.fixedTimes)) doses.push(createDose(med, time, "fixed", "固定时间"));
    for (const time of parseTimes(med.flexibleTimes)) doses.push(createDose(med, time, "flexible", "非固定时间"));
    for (const meal of Object.keys(med.mealBefore)) {
      if (!med.mealBefore[meal]) continue;
      const time = minutesToTime(timeToMinutes(mealTimes[meal]) - med.mealBeforeMinutes);
      doses.push(createDose(med, time, `${meal}-before`, `${mealLabels[meal]} ${med.mealBeforeMinutes} 分钟`));
    }
    if (med.bedtimeEnabled) doses.push(createDose(med, state.settings.bedtime, "bedtime", "睡前"));
  }
  return doses
    .map((dose) => ({ ...dose, ...(state.doses[dose.id] || {}) }))
    .sort((a, b) => timeToMinutes(displayTime(a)) - timeToMinutes(displayTime(b)));
}

function createDose(med, time, reason, group) {
  return {
    id: `${state.settings.viewDate}-${med.id}-${time}-${reason}`,
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
  els.viewDate.value = state.settings.viewDate;
  renderTimePair("breakfastTime", "早餐", state.settings.breakfastTime);
  renderTimePair("lunchTime", "午餐", state.settings.lunchTime);
  renderTimePair("dinnerTime", "晚饭", state.settings.dinnerTime);
  renderTimePair("bedtime", "睡前", state.settings.bedtime);
  renderReminderSettings();
  renderMedicines();
  renderNextDose(doses);
  renderTimeline(doses);
  renderActiveReminder(doses);
}

function renderTimePair(id, label, value) {
  const host = document.querySelector(`#${id}`);
  const [h, m] = normalizeTime(value).split(":");
  host.className = "time-pair";
  host.innerHTML = `
    <span>${label}</span>
    <label>时<input data-time="${id}" data-part="hour" type="number" min="0" max="23" value="${h}" /></label>
    <label>分<input data-time="${id}" data-part="minute" type="number" min="0" max="59" value="${m}" /></label>
  `;
}

function renderReminderSettings() {
  const items = [
    ["notification", "通知弹窗"],
    ["vibrate", "震动提醒"],
    ["sound", "铃声提醒"],
    ["lockScreen", "锁屏操作"],
    ["fullScreen", "强提醒全屏"],
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
        <button class="mini-button" data-edit="${med.id}" type="button">编辑</button>
      </div>
      <p class="rule-summary">${escapeHtml(summaryRules(med))}</p>
    `;
    els.medicineSettings.append(card);
  }
}

function summaryRules(med) {
  const rules = [];
  if (med.fixedTimes) rules.push(`固定 ${med.fixedTimes}`);
  if (med.flexibleTimes) rules.push(`非固定 ${med.flexibleTimes}`);
  if (med.mealBefore.breakfast) rules.push("早餐前");
  if (med.mealBefore.lunch) rules.push("午餐前");
  if (med.mealBefore.dinner) rules.push("晚饭前");
  if (med.bedtimeEnabled) rules.push("睡前");
  return rules.length ? rules.join(" · ") : "还没有设置提醒时间";
}

function renderNextDose(doses) {
  const next = doses.find((d) => d.status !== "done");
  if (!next) {
    els.nextDoseText.textContent = "当前查看日期没有待确认提醒。";
    return;
  }
  const names = doses
    .filter((d) => displayTime(d) === displayTime(next) && d.status !== "done")
    .map((d) => medInfo(d.medicineId)?.name)
    .filter(Boolean)
    .join("、");
  els.nextDoseText.textContent = `下一次 ${displayTime(next)}：${names}`;
}

function renderTimeline(doses) {
  els.timeline.innerHTML = "";
  const groups = groupDoses(doses);
  if (!groups.size) {
    els.timeline.innerHTML = `<div class="empty-state timeline-empty">这一天没有需要提醒的药品。可以添加时间或调整循环日期。</div>`;
    return;
  }
  for (const [time, group] of groups) {
    const allDone = group.every((d) => d.status === "done");
    const card = document.createElement("article");
    card.className = "dose-card";
    card.innerHTML = `
      <div class="dose-time">${time}</div>
      <div class="dose-body">
        <div class="dose-title-row">
          <strong>${group.map((d) => medInfo(d.medicineId)?.name).filter(Boolean).join("、")}</strong>
          <span class="tag ${allDone ? "done" : group.some(isLate) ? "late" : ""}">${allDone ? "已完成" : group.some(isLate) ? "逾期未确认" : "待确认"}</span>
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
        <span class="med-note">${escapeHtml(med.doseAmount)} · ${escapeHtml(dose.group)}${dose.delayedTo ? `，已延后到 ${dose.delayedTo}` : ""}</span>
      </div>
      <div class="mini-actions">
        <button class="mini-button" data-done="${dose.id}" type="button">确认</button>
        <button class="mini-button warn" data-delay="${dose.id}" type="button">延后</button>
      </div>
    </div>
  `;
}

function renderActiveReminder(doses) {
  const active = doses.filter((d) => state.activeIds.includes(d.id) && d.status !== "done");
  if (!active.length) {
    els.activeReminder.className = "active-reminder empty-state";
    els.activeReminder.textContent = "还没有触发提醒。";
    return;
  }
  els.activeReminder.className = "active-reminder";
  els.activeReminder.innerHTML = `<strong>${displayTime(active[0])} 需要确认</strong><div class="med-list">${active.map(renderDoseItem).join("")}</div>`;
}

function openMedicineDialog(med) {
  editingId = med?.id || null;
  draft = structuredClone(med || createMedicine({ name: `新药品 ${state.medicines.length + 1}`, fixedTimes: "08:00", color: PALETTE[state.medicines.length % PALETTE.length] }));
  els.medicineDialogTitle.textContent = editingId ? "编辑药品" : "添加药品";
  els.deleteMedicineBtn.hidden = !editingId;
  renderMedicineEditor();
  els.medicineDialog.showModal();
}

function renderMedicineEditor() {
  els.medicineEditor.innerHTML = `
    <div class="form-grid editor-grid">
      ${field("name", "名称", "text", draft.name)}
      ${field("doseAmount", "用量", "text", draft.doseAmount)}
      ${field("startDate", "开始日期", "date", draft.startDate)}
      ${field("courseLength", "每疗程天数", "number", draft.courseLength)}
      ${field("totalCourses", "疗程数", "number", draft.totalCourses)}
      ${field("fixedTimes", "固定时间", "text", draft.fixedTimes, "08:00, 20:00")}
      ${field("flexibleTimes", "非固定时间", "text", draft.flexibleTimes, "今天临时 16:30")}
      ${field("mealBeforeMinutes", "饭前提前分钟", "number", draft.mealBeforeMinutes)}
    </div>
    <div>
      <p class="repeat-title">颜色</p>
      <div class="palette">${PALETTE.map((color) => `<button class="palette-dot ${draft.color === color ? "selected" : ""}" data-color="${color}" style="--dot:${color}" type="button"></button>`).join("")}</div>
    </div>
    <div class="option-row">
      ${check("breakfast", "早餐前", draft.mealBefore.breakfast)}
      ${check("lunch", "午餐前", draft.mealBefore.lunch)}
      ${check("dinner", "晚饭前", draft.mealBefore.dinner)}
      ${check("bedtimeEnabled", "睡前", draft.bedtimeEnabled)}
    </div>
    <div class="repeat-days"><span class="repeat-title">循环日期</span>${DAYS.map((d, i) => `<button class="day-chip ${draft.repeatDays.includes(i) ? "selected" : ""}" data-day="${i}" type="button">${d}</button>`).join("")}</div>
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
  saveState();
  render();
}

function deleteEditing() {
  if (!editingId) return;
  state.medicines = state.medicines.filter((m) => m.id !== editingId);
  for (const key of Object.keys(state.doses)) if (key.includes(`-${editingId}-`)) delete state.doses[key];
  state.activeIds = state.activeIds.filter((id) => !id.includes(`-${editingId}-`));
  saveState();
  render();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
}

function bindEvents() {
  els.viewDate.addEventListener("change", () => {
    state.settings.viewDate = els.viewDate.value;
    state.activeIds = [];
    saveState();
    render();
  });
  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.dataset.time) {
      const current = normalizeTime(state.settings[target.dataset.time]);
      const [h, m] = current.split(":");
      const next = target.dataset.part === "hour"
        ? `${String(Math.min(23, Number(target.value) || 0)).padStart(2, "0")}:${m}`
        : `${h}:${String(Math.min(59, Number(target.value) || 0)).padStart(2, "0")}`;
      state.settings[target.dataset.time] = next;
      saveState();
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
    if (target.dataset.edit) openMedicineDialog(state.medicines.find((m) => m.id === target.dataset.edit));
    if (target.dataset.done) setDose(target.dataset.done, { status: "done" });
    if (target.dataset.delay) {
      delayTargetId = target.dataset.delay;
      const dose = buildDoses().find((d) => d.id === delayTargetId);
      els.delayTitle.textContent = `延后 ${medInfo(dose?.medicineId)?.name || "药品"}`;
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
  els.addMedicineBtn.addEventListener("click", () => openMedicineDialog(null));
  els.resetBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    state = loadState();
    render();
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
