"use strict";

/* Replace with your real email address before submitting. */
const CONTACT_EMAIL = "ceesaybaboucarrb@gmail.com";

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

/* ---------- Theme ---------- */
const root = document.documentElement;
const themeBtn = $("#themeToggle");

function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  const dark = theme === "dark";
  themeBtn.setAttribute("aria-pressed", String(dark));
  themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
}

const savedTheme = safeGet("portfolio-theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

themeBtn.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  safeSet("portfolio-theme", next);
});

/* ---------- Mobile menu ---------- */
const menuBtn = $("#menuBtn");
const nav = $("#nav");

function setMenu(open) {
  nav.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); menuBtn.focus(); }
});

/* ---------- Highlight the nav link for the section in view ---------- */
const navLinks = $$(".nav a");
const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);

if ("IntersectionObserver" in window) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => {
        const active = a.getAttribute("href") === `#${entry.target.id}`;
        a.classList.toggle("is-active", active);
        if (active) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => spy.observe(s));
}

/* ---------- Project filter ---------- */
const chips = $$(".chip");
const cards = $$(".card");
const emptyMsg = $("#projectEmpty");

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const filter = chip.dataset.filter;
    chips.forEach((c) => {
      const on = c === chip;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-pressed", String(on));
    });

    let visible = 0;
    cards.forEach((card) => {
      const show = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("is-hidden", !show);
      if (show) visible++;
    });
    emptyMsg.hidden = visible !== 0;
  });
});

/* ---------- Contact form ---------- */
const form = $("#contactForm");
const status = $("#formStatus");
const messageField = $("#message");
const counter = $("#count");

messageField.addEventListener("input", () => { counter.textContent = messageField.value.length; });

const rules = {
  name: (v) => (v.trim().length < 2 ? "Enter your name (at least 2 characters)." : ""),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Enter a valid email address, like name@example.com."),
  message: (v) => (v.trim().length < 10 ? "Write at least 10 characters so I know how to help." : ""),
};

function validateField(name) {
  const input = form.elements[name];
  const error = $(`#${name}Error`);
  const msg = rules[name](input.value);
  error.textContent = msg;
  input.closest(".field").classList.toggle("invalid", Boolean(msg));
  input.setAttribute("aria-invalid", msg ? "true" : "false");
  if (msg) input.setAttribute("aria-describedby", `${name}Error`); else input.removeAttribute("aria-describedby");
  return !msg;
}

Object.keys(rules).forEach((name) => {
  const input = form.elements[name];
  input.addEventListener("blur", () => validateField(name));
  input.addEventListener("input", () => { if (input.closest(".field").classList.contains("invalid")) validateField(name); });
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  status.className = "status";
  status.textContent = "";

  const results = Object.keys(rules).map(validateField);
  if (results.includes(false)) {
    status.classList.add("fail");
    status.textContent = "Fix the highlighted fields and send again.";
    const firstBad = Object.keys(rules).find((n) => form.elements[n].getAttribute("aria-invalid") === "true");
    form.elements[firstBad].focus();
    return;
  }

  /* No backend: open the visitor's email app with the message filled in. */
  const { name, email, message } = form.elements;
  const subject = encodeURIComponent(`Portfolio message from ${name.value.trim()}`);
  const body = encodeURIComponent(`${message.value.trim()}\n\nFrom: ${name.value.trim()} (${email.value.trim()})`);
  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

  status.classList.add("ok");
  status.textContent = "Thanks. Your email app should open with the message ready to send.";
  form.reset();
  counter.textContent = "0";
  $$(".field", form).forEach((f) => f.classList.remove("invalid"));
});

/* ---------- Footer year ---------- */
$("#year").textContent = new Date().getFullYear();
