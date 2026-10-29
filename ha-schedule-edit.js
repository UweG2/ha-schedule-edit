/* Schedule helpers: open weekly editor once; Back closes dialog (no history flash). */
(() => {
  if (window.__haSchedEditV4) return;
  window.__haSchedEditV4 = true;
  window.__haSchedEditV2 = true;
  window.__haSchedEditV3 = true;

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

  let activeEntity = null;
  let sawEditor = false;
  let opening = false;
  let lastForcedId = null;
  let lastForcedAt = 0;

  const goSettingsOnce = (entityId) => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl || !entityId || !String(entityId).startsWith("schedule.")) return;

    const now = Date.now();
    if (lastForcedId === entityId && now - lastForcedAt < 1500) return;
    lastForcedId = entityId;
    lastForcedAt = now;
    opening = true;
    activeEntity = entityId;
    sawEditor = false;

    let tries = 0;
    const tick = () => {
      tries += 1;
      const dlg = findEl(haEl, "ha-more-info-dialog");
      if (!dlg) {
        if (tries < 20) setTimeout(tick, 70);
        else opening = false;
        return;
      }
      const id = dlg.entityId || dlg._entityId;
      if (id !== entityId) {
        if (tries < 20) setTimeout(tick, 70);
        else opening = false;
        return;
      }
      if (findEl(haEl, "ha-schedule-form")) {
        sawEditor = true;
        opening = false;
        return;
      }
      try {
        if (typeof dlg._goToSettings === "function") dlg._goToSettings();
      } catch (e) {}
      if (tries < 20) setTimeout(tick, 70);
      else opening = false;
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
      if (!entityId) {
        activeEntity = null;
        sawEditor = false;
        opening = false;
        return;
      }
      if (!String(entityId).startsWith("schedule.")) {
        activeEntity = null;
        sawEditor = false;
        return;
      }
      goSettingsOnce(entityId);
    },
    true
  );

  // If user hits Back from editor → HA shows info/history briefly.
  // Detect leave-editor and close the whole dialog instead.
  setInterval(() => {
    if (opening) return;
    const haEl = document.querySelector("home-assistant");
    if (!haEl) return;
    const dlg = findEl(haEl, "ha-more-info-dialog");
    if (!dlg) {
      activeEntity = null;
      sawEditor = false;
      return;
    }
    const id = dlg.entityId || dlg._entityId || "";
    if (!String(id).startsWith("schedule.")) return;

    const hasForm = !!findEl(haEl, "ha-schedule-form");
    if (hasForm) {
      sawEditor = true;
      activeEntity = id;
      return;
    }

    // Had editor, now back on info page for same schedule → close
    if (sawEditor && activeEntity === id && !hasForm) {
      sawEditor = false;
      activeEntity = null;
      closeMoreInfo();
    }
  }, 120);
})();
