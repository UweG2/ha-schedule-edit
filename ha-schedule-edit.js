/* Schedule helpers: open weekly editor; Back acts like Close (no detail flash). */
(() => {
  if (window.__haSchedEditV8) return;
  window.__haSchedEditV8 = true;
  window.__haSchedEditV2 = true;
  window.__haSchedEditV3 = true;
  window.__haSchedEditV4 = true;
  window.__haSchedEditV5 = true;
  window.__haSchedEditV6 = true;
  window.__haSchedEditV7 = true;

  const findEl = (root, tag, depth = 0) => {
    if (!root || depth > 30) return null;
    if (root.querySelector) {
      const el = root.querySelector(tag);
      if (el) return el;
      for (const n of root.querySelectorAll("*")) {
        if (n.shadowRoot) {
          const f = findEl(n.shadowRoot, tag, depth + 1);
          if (f) return f;
        }
      }
    }
    if (root.shadowRoot) return findEl(root.shadowRoot, tag, depth + 1);
    return null;
  };

  const findByAria = (root, text, depth = 0) => {
    if (!root || depth > 28) return null;
    const nodes = root.querySelectorAll
      ? [...root.querySelectorAll("ha-button, button, ha-icon-button")]
      : [];
    for (const n of nodes) {
      const aria = (n.getAttribute("aria-label") || "").toLowerCase();
      if (aria.includes(text)) return n;
    }
    for (const n of root.querySelectorAll ? root.querySelectorAll("*") : []) {
      if (n.shadowRoot) {
        const f = findByAria(n.shadowRoot, text, depth + 1);
        if (f) return f;
      }
    }
    if (root.shadowRoot) return findByAria(root.shadowRoot, text, depth + 1);
    return null;
  };

  const isScheduleId = (id) => String(id || "").startsWith("schedule.");
  const dialogEntityId = (dlg) => dlg && (dlg.entityId || dlg._entityId || "");

  const dismissDialog = () => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl) return;
    const dlg = findEl(haEl, "ha-more-info-dialog");
    if (!dlg) return;
    const closeBtn = findByAria(dlg, "schließen") || findByAria(dlg, "close");
    if (closeBtn) {
      closeBtn.click();
      return;
    }
    try {
      if (typeof dlg.closeDialog === "function") dlg.closeDialog();
    } catch (e) {}
    haEl.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId: null },
        bubbles: true,
        composed: true,
      })
    );
  };

  let lastForcedId = null;
  let lastForcedAt = 0;

  const goSettingsOnce = (entityId) => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl || !isScheduleId(entityId)) return;

    const now = Date.now();
    if (lastForcedId === entityId && now - lastForcedAt < 1500) return;
    lastForcedId = entityId;
    lastForcedAt = now;

    let tries = 0;
    const tick = () => {
      tries += 1;
      const dlg = findEl(haEl, "ha-more-info-dialog");
      if (!dlg) {
        if (tries < 25) setTimeout(tick, 60);
        return;
      }
      if (dialogEntityId(dlg) !== entityId) {
        if (tries < 25) setTimeout(tick, 60);
        return;
      }
      if (findEl(haEl, "ha-schedule-form")) return;
      try {
        if (typeof dlg._goToSettings === "function") dlg._goToSettings();
      } catch (e) {}
      if (tries < 25) setTimeout(tick, 60);
    };
    setTimeout(tick, 20);
  };

  window.__openHaScheduleEditor = (entityId) => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl || !entityId) return;
    lastForcedId = null;
    haEl.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId, view: "settings" },
        bubbles: true,
        composed: true,
      })
    );
    goSettingsOnce(entityId);
  };

  window.addEventListener("ll-custom", (ev) => {
    const d = ev.detail || {};
    if (!(d.schedule_edit || d.action === "schedule_edit")) return;
    const entityId = d.entity || d.entity_id;
    if (entityId) window.__openHaScheduleEditor(entityId);
  });

  document.addEventListener(
    "hass-more-info",
    (ev) => {
      const entityId = ev.detail && ev.detail.entityId;
      if (!entityId) return;
      if (!isScheduleId(entityId)) return;
      goSettingsOnce(entityId);
    },
    true
  );

  // Back / "Zur Detailansicht" → dismiss like Schließen
  const backHandler = (ev) => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl) return;
    const dlg = findEl(haEl, "ha-more-info-dialog");
    if (!dlg || !isScheduleId(dialogEntityId(dlg))) return;
    // only while weekly editor is visible
    if (!findEl(haEl, "ha-schedule-form")) return;

    const path = typeof ev.composedPath === "function" ? ev.composedPath() : [];
    let isBack = false;
    for (const n of path) {
      if (!n || !n.getAttribute) continue;
      const aria = (n.getAttribute("aria-label") || n.title || "").toLowerCase();
      if (
        aria.includes("zurück") ||
        aria.includes("back") ||
        aria.includes("detailansicht")
      ) {
        isBack = true;
        break;
      }
    }
    if (!isBack) return;

    ev.preventDefault();
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    dismissDialog();
  };

  document.addEventListener("pointerdown", backHandler, true);
  document.addEventListener("click", backHandler, true);
})();
