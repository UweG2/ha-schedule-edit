/* Schedule helpers: open weekly editor; Back closes without detail flash. */
(() => {
  if (window.__haSchedEditV7) return;
  window.__haSchedEditV7 = true;
  window.__haSchedEditV2 = true;
  window.__haSchedEditV3 = true;
  window.__haSchedEditV4 = true;
  window.__haSchedEditV5 = true;
  window.__haSchedEditV6 = true;

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
    const dlg = findEl(haEl, "ha-more-info-dialog");
    try {
      if (dlg && typeof dlg.closeDialog === "function") dlg.closeDialog();
    } catch (e) {}
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
  let editorOpen = false;

  const patchDialog = (dlg) => {
    if (!dlg || dlg.__haSchedPatchedV7) return;
    dlg.__haSchedPatchedV7 = true;

    const wrap = (name) => {
      if (typeof dlg[name] !== "function" || dlg[name].__haSchedWrapped) return;
      const orig = dlg[name].bind(dlg);
      const wrapped = (...args) => {
        const id = dialogEntityId(dlg);
        if (!isScheduleId(id)) return orig(...args);

        // Any navigation away from settings while editing a schedule → close
        if (name === "_setView") {
          const view = args[0];
          if (view && view !== "settings") {
            closeMoreInfo();
            return;
          }
        }
        if (name === "_goBack") {
          closeMoreInfo();
          return;
        }
        return orig(...args);
      };
      wrapped.__haSchedWrapped = true;
      dlg[name] = wrapped;
    };

    wrap("_setView");
    wrap("_goBack");
  };

  const goSettingsOnce = (entityId) => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl || !isScheduleId(entityId)) return;

    const now = Date.now();
    if (lastForcedId === entityId && now - lastForcedAt < 1500) return;
    lastForcedId = entityId;
    lastForcedAt = now;
    editorOpen = false;

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
      if (findEl(haEl, "ha-schedule-form")) {
        editorOpen = true;
        return;
      }
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
      if (!entityId) {
        editorOpen = false;
        return;
      }
      if (!isScheduleId(entityId)) return;
      goSettingsOnce(entityId);
    },
    true
  );

  // Capture Back while schedule editor visible
  const backHandler = (ev) => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl) return;
    const dlg = findEl(haEl, "ha-more-info-dialog");
    if (!dlg || !isScheduleId(dialogEntityId(dlg))) return;
    if (!findEl(haEl, "ha-schedule-form")) return;

    const path = typeof ev.composedPath === "function" ? ev.composedPath() : [];
    let isBack = false;
    for (const n of path) {
      if (!n || !n.getAttribute) continue;
      const aria = (n.getAttribute("aria-label") || n.title || "").toLowerCase();
      if (aria.includes("zurück") || aria.includes("back") || aria.includes("detailansicht")) {
        isBack = true;
        break;
      }
    }
    if (!isBack) return;

    ev.preventDefault();
    ev.stopImmediatePropagation();
    ev.stopPropagation();
    editorOpen = false;
    closeMoreInfo();
  };
  document.addEventListener("pointerdown", backHandler, true);
  document.addEventListener("click", backHandler, true);

  // Fallback: if editor was shown and disappears while dialog remains → close
  setInterval(() => {
    const haEl = document.querySelector("home-assistant");
    if (!haEl) return;
    const dlg = findEl(haEl, "ha-more-info-dialog");
    if (!dlg) {
      editorOpen = false;
      return;
    }
    if (!isScheduleId(dialogEntityId(dlg))) return;
    patchDialog(dlg);
    const hasForm = !!findEl(haEl, "ha-schedule-form");
    if (hasForm) {
      editorOpen = true;
      return;
    }
    if (editorOpen && !hasForm) {
      editorOpen = false;
      closeMoreInfo();
    }
  }, 80);
})();
