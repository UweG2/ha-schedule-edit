/* Open schedule helpers once in the weekly editor. Do not fight Back/Save. */
(() => {
  if (window.__haSchedEditV3) return;
  window.__haSchedEditV3 = true;
  // disable old aggressive loop if still present from v2
  window.__haSchedEditV2 = true;

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

  let lastForcedId = null;
  let lastForcedAt = 0;

  const goSettingsOnce = (entityId) => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl || !entityId || !String(entityId).startsWith("schedule.")) return;

    const now = Date.now();
    // only once per open (same entity within 2s = ignore)
    if (lastForcedId === entityId && now - lastForcedAt < 2000) return;
    lastForcedId = entityId;
    lastForcedAt = now;

    let tries = 0;
    const tick = () => {
      tries += 1;
      const dlg = findEl(haEl, "ha-more-info-dialog");
      if (!dlg) {
        if (tries < 15) setTimeout(tick, 80);
        return;
      }
      const id = dlg.entityId || dlg._entityId;
      if (id !== entityId) {
        if (tries < 15) setTimeout(tick, 80);
        return;
      }
      // already in editor → stop
      if (findEl(haEl, "ha-schedule-form")) return;
      try {
        if (typeof dlg._goToSettings === "function") dlg._goToSettings();
      } catch (e) {}
    };
    setTimeout(tick, 30);
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

  // When more-info opens for a schedule, jump to editor once — then leave UI alone
  document.addEventListener(
    "hass-more-info",
    (ev) => {
      const entityId = ev.detail && ev.detail.entityId;
      if (!entityId) {
        lastForcedId = null;
        return;
      }
      if (!String(entityId).startsWith("schedule.")) return;
      // If caller already requested settings, still ensure form once
      goSettingsOnce(entityId);
    },
    true
  );
})();
