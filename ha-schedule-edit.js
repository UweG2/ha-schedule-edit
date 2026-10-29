/* Schedule helpers: open weekly editor; Back closes dialog (no detail/history flash). */
(() => {
  if (window.__haSchedEditV5) return;
  window.__haSchedEditV5 = true;
  window.__haSchedEditV2 = true;
  window.__haSchedEditV3 = true;
  window.__haSchedEditV4 = true;

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

  const closeMoreInfo = () => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl) return;
    haEl.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId: null },
        bubbles: true,
        composed: true,
      })
    );
  };

  const isScheduleId = (id) => String(id || "").startsWith("schedule.");

  const dialogEntityId = (dlg) => dlg && (dlg.entityId || dlg._entityId || "");

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
        if (tries < 20) setTimeout(tick, 70);
        return;
      }
      if (dialogEntityId(dlg) !== entityId) {
        if (tries < 20) setTimeout(tick, 70);
        return;
      }
      if (findEl(haEl, "ha-schedule-form")) return;
      try {
        if (typeof dlg._goToSettings === "function") dlg._goToSettings();
      } catch (e) {}
      if (tries < 20) setTimeout(tick, 70);
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

  // Capture "Zurück zur Detailansicht" while schedule editor is open → close instead
  const shouldCloseOnBack = (ev) => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl) return false;
    const dlg = findEl(haEl, "ha-more-info-dialog");
    if (!dlg || !isScheduleId(dialogEntityId(dlg))) return false;
    if (!findEl(haEl, "ha-schedule-form")) return false;

    const path = typeof ev.composedPath === "function" ? ev.composedPath() : [];
    for (const n of path) {
      if (!n || !n.getAttribute) continue;
      const aria = (n.getAttribute("aria-label") || n.title || "").toLowerCase();
      if (aria.includes("zurück") || aria.includes("back")) return true;
      const icon = n.icon || n.getAttribute("icon") || "";
      if (/arrow-left|chevron-left/.test(icon)) return true;
    }
    return false;
  };

  const onBackIntent = (ev) => {
    if (!shouldCloseOnBack(ev)) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    closeMoreInfo();
  };

  document.addEventListener("click", onBackIntent, true);
  document.addEventListener("pointerdown", onBackIntent, true);
})();
