"use strict";

/* =========================================================
   Pure logic (no DOM): easy to test, see test.js
   ========================================================= */
const STORAGE_KEY = "todo-app:tasks:v1";
const MAX_LENGTH = 120;

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function validateText(text) {
  const t = String(text ?? "").trim();
  if (!t) return { ok: false, error: "Enter a task before adding it." };
  if (t.length > MAX_LENGTH) return { ok: false, error: `Keep tasks under ${MAX_LENGTH} characters.` };
  return { ok: true, value: t };
}

function addTask(tasks, text) {
  const check = validateText(text);
  if (!check.ok) return { tasks, error: check.error };
  const task = { id: makeId(), text: check.value, done: false, createdAt: Date.now() };
  return { tasks: [task, ...tasks], error: "" };
}

function toggleTask(tasks, id) {
  return tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

function deleteTask(tasks, id) {
  return tasks.filter((t) => t.id !== id);
}

function editTask(tasks, id, text) {
  const check = validateText(text);
  if (!check.ok) return { tasks, error: check.error };
  return { tasks: tasks.map((t) => (t.id === id ? { ...t, text: check.value } : t)), error: "" };
}

function clearCompleted(tasks) {
  return tasks.filter((t) => !t.done);
}

function filterTasks(tasks, filter) {
  if (filter === "active") return tasks.filter((t) => !t.done);
  if (filter === "done") return tasks.filter((t) => t.done);
  return tasks;
}

function countRemaining(tasks) {
  return tasks.filter((t) => !t.done).length;
}

function loadTasks(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t) => t && typeof t.id === "string" && typeof t.text === "string")
                 .map((t) => ({ id: t.id, text: t.text, done: Boolean(t.done), createdAt: t.createdAt || 0 }));
  } catch {
    return [];
  }
}

function saveTasks(storage, tasks) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    return false;
  }
}

/* =========================================================
   DOM layer
   ========================================================= */
function startApp() {
  const $ = (sel) => document.querySelector(sel);
  const els = {
    form: $("#addForm"), input: $("#taskInput"), error: $("#addError"),
    list: $("#taskList"), empty: $("#empty"), count: $("#count"),
    clear: $("#clearDone"), filters: document.querySelectorAll(".filter"), today: $("#today"),
  };

  let tasks = loadTasks(window.localStorage);
  let filter = "all";
  let editingId = null;

  els.today.textContent = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  function commit(next) {
    tasks = next;
    if (!saveTasks(window.localStorage, tasks)) {
      els.error.textContent = "Could not save to this browser. Your changes will be lost on reload.";
    }
    render();
  }

  function showError(msg, field = els.input) {
    els.error.textContent = msg;
    field.classList.toggle("invalid", Boolean(msg));
  }

  function emptyMessage() {
    if (tasks.length === 0) return "No tasks yet. Add your first one above.";
    if (filter === "active") return "Nothing left to do. Nice work.";
    if (filter === "done") return "No completed tasks yet.";
    return "";
  }

  function buildItem(task) {
    const li = document.createElement("li");
    li.className = "task" + (task.done ? " done" : "");
    li.dataset.id = task.id;

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = task.done;
    box.setAttribute("aria-label", `Mark "${task.text}" as ${task.done ? "not done" : "done"}`);
    box.addEventListener("change", () => commit(toggleTask(tasks, task.id)));
    li.appendChild(box);

    if (editingId === task.id) {
      const edit = document.createElement("input");
      edit.type = "text";
      edit.className = "edit-input";
      edit.value = task.text;
      edit.maxLength = MAX_LENGTH;
      edit.setAttribute("aria-label", "Edit task");
      edit.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { editingId = null; showError(""); render(); }
        if (e.key === "Enter") finishEdit(task.id, edit.value);
      });
      edit.addEventListener("blur", () => { if (editingId === task.id) finishEdit(task.id, edit.value); });
      li.appendChild(edit);
      queueMicrotask(() => { edit.focus(); edit.select(); });
      return li;
    }

    const text = document.createElement("span");
    text.className = "text";
    text.textContent = task.text;
    text.addEventListener("dblclick", () => startEdit(task.id));
    li.appendChild(text);

    const actions = document.createElement("div");
    actions.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon";
    editBtn.textContent = "Edit";
    editBtn.setAttribute("aria-label", `Edit "${task.text}"`);
    editBtn.addEventListener("click", () => startEdit(task.id));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon delete";
    delBtn.textContent = "Delete";
    delBtn.setAttribute("aria-label", `Delete "${task.text}"`);
    delBtn.addEventListener("click", () => {
      li.classList.add("leaving");
      setTimeout(() => commit(deleteTask(tasks, task.id)), 180);
    });

    actions.append(editBtn, delBtn);
    li.appendChild(actions);
    return li;
  }

  function startEdit(id) { editingId = id; render(); }

  function finishEdit(id, value) {
    const result = editTask(tasks, id, value);
    if (result.error) { showError(result.error); return; }
    editingId = null;
    showError("");
    commit(result.tasks);
  }

  function render() {
    const visible = filterTasks(tasks, filter);
    els.list.replaceChildren(...visible.map(buildItem));

    const msg = emptyMessage();
    els.empty.hidden = visible.length !== 0;
    els.empty.textContent = msg;

    const left = countRemaining(tasks);
    els.count.textContent = tasks.length === 0 ? "" : `${left} ${left === 1 ? "task" : "tasks"} left`;
    els.clear.disabled = !tasks.some((t) => t.done);
  }

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const result = addTask(tasks, els.input.value);
    if (result.error) { showError(result.error); els.input.focus(); return; }
    showError("");
    els.input.value = "";
    commit(result.tasks);
    els.input.focus();
  });

  els.input.addEventListener("input", () => { if (els.error.textContent) showError(""); });

  els.filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      els.filters.forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      render();
    });
  });

  els.clear.addEventListener("click", () => commit(clearCompleted(tasks)));

  /* Keep several open tabs in sync */
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) { tasks = loadTasks(window.localStorage); render(); }
  });

  render();
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", startApp);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STORAGE_KEY, MAX_LENGTH, validateText, addTask, toggleTask, deleteTask,
    editTask, clearCompleted, filterTasks, countRemaining, loadTasks, saveTasks,
  };
}
