/* Opens schedule helpers directly in the weekly editor (settings view). */
(() => {
  if (window.__haSchedEditV2) return;
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

  const openScheduleEditor = (entityId) => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl || !entityId) return;
    haEl.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId, view: "settings" },
        bubbles: true,
        composed: true,
      })
    );
    let tries = 0;
    const tick = () => {
      tries += 1;
      const dlg = findEl(haEl, "ha-more-info-dialog");
      if (dlg && (dlg.entityId || dlg._entityId) === entityId) {
        try {
          dlg._goToSettings && dlg._goToSettings();
        } catch (e) {}
        try {
          dlg.view = "settings";
        } catch (e) {}
        if (findEl(haEl, "ha-schedule-form")) return;
      }
      if (tries < 30) setTimeout(tick, 100);
    };
    setTimeout(tick, 40);
  };

  window.__openHaScheduleEditor = openScheduleEditor;

  window.addEventListener("ll-custom", (ev) => {
    const d = ev.detail || {};
    if (!(d.schedule_edit || d.action === "schedule_edit")) return;
    const entityId = d.entity || d.entity_id;
    if (entityId) openScheduleEditor(entityId);
  });

  setInterval(() => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl) return;
    const dlg = findEl(haEl, "ha-more-info-dialog");
    if (!dlg) return;
    const id = dlg.entityId || dlg._entityId || "";
    if (!String(id).startsWith("schedule.")) return;
    if (findEl(haEl, "ha-schedule-form")) return;
    try {
      dlg._goToSettings && dlg._goToSettings();
    } catch (e) {}
  }, 400);
})();
