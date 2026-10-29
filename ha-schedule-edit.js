/* Schedule helpers: open weekly editor; Back closes (no detail flash). */
(() => {
  if (window.__haSchedEditV6) return;
  window.__haSchedEditV6 = true;
  window.__haSchedEditV2 = true;
  window.__haSchedEditV3 = true;
  window.__haSchedEditV4 = true;
  window.__haSchedEditV5 = true;

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

  const patchDialog = (dlg) => {
    if (!dlg || dlg.__haSchedPatchedV6) return;
    dlg.__haSchedPatchedV6 = true;

    if (typeof dlg._setView === "function") {
      const origSetView = dlg._setView.bind(dlg);
      dlg._setView = (view, ...rest) => {
        const id = dialogEntityId(dlg);
        // Back from settings → would show info/history; close instead
        if (isScheduleId(id) && (view === "info" || view === "history")) {
          closeMoreInfo();
          return;
        }
        return origSetView(view, ...rest);
      };
    }

    if (typeof dlg._goBack === "function") {
      const origGoBack = dlg._goBack.bind(dlg);
      dlg._goBack = (...args) => {
        if (isScheduleId(dialogEntityId(dlg))) {
          closeMoreInfo();
          return;
        }
        return origGoBack(...args);
      };
    }
  };

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
      patchDialog(dlg);
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

  // Keep dialog patched while open
  setInterval(() => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl) return;
    const dlg = findEl(haEl, "ha-more-info-dialog");
    if (dlg && isScheduleId(dialogEntityId(dlg))) patchDialog(dlg);
  }, 300);
})();
