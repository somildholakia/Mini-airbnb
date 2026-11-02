(() => {
  "use strict";

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-value]");
    if (!button) return;

    const value = button.getAttribute("data-copy-value") || "";
    const original = button.textContent;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = document.createElement("textarea");
        input.value = value;
        input.setAttribute("readonly", "");
        input.style.position = "absolute";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Clipboard copy was not available.");
      }

      button.textContent = "Copied";
      button.setAttribute("aria-live", "polite");
      window.setTimeout(() => { button.textContent = original; }, 1800);
    } catch (_error) {
      button.textContent = "Copy unavailable";
      window.setTimeout(() => { button.textContent = original; }, 1800);
    }
  });

  const list = document.querySelector("[data-sortable-list]");
  const form = document.getElementById("trip-item-order-form");
  const orderInput = form?.querySelector('[name="itemIds"]');

  if (!list || !form || !orderInput) return;

  let draggedItem = null;

  function getItems() {
    return Array.from(list.querySelectorAll("[data-sortable-item]"));
  }

  function syncOrder() {
    const items = getItems();
    orderInput.value = items.map((item) => item.dataset.itemId).join(",");

    items.forEach((item, index) => {
      const up = item.querySelector("[data-move-up]");
      const down = item.querySelector("[data-move-down]");
      if (up) up.disabled = index === 0;
      if (down) down.disabled = index === items.length - 1;
      item.setAttribute("aria-posinset", String(index + 1));
      item.setAttribute("aria-setsize", String(items.length));
    });
  }

  list.addEventListener("click", (event) => {
    const upButton = event.target.closest("[data-move-up]");
    const downButton = event.target.closest("[data-move-down]");
    const item = event.target.closest("[data-sortable-item]");
    if (!item) return;

    if (upButton) {
      const previous = item.previousElementSibling;
      if (previous) list.insertBefore(item, previous);
      syncOrder();
    } else if (downButton) {
      const next = item.nextElementSibling;
      if (next) list.insertBefore(next, item);
      syncOrder();
    }
  });

  list.addEventListener("dragstart", (event) => {
    const handle = event.target.closest("[data-drag-handle]");
    const item = event.target.closest("[data-sortable-item]");
    if (!handle || !item) {
      event.preventDefault();
      return;
    }

    draggedItem = item;
    item.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.dataset.itemId || "");
  });

  list.addEventListener("dragover", (event) => {
    if (!draggedItem) return;
    event.preventDefault();

    const target = event.target.closest("[data-sortable-item]");
    if (!target || target === draggedItem) return;

    const bounds = target.getBoundingClientRect();
    const insertAfter = event.clientY > bounds.top + bounds.height / 2;
    list.insertBefore(draggedItem, insertAfter ? target.nextElementSibling : target);
    syncOrder();
  });

  list.addEventListener("drop", (event) => {
    if (!draggedItem) return;
    event.preventDefault();
    syncOrder();
  });

  list.addEventListener("dragend", () => {
    if (draggedItem) draggedItem.classList.remove("is-dragging");
    draggedItem = null;
    syncOrder();
  });

  form.addEventListener("submit", syncOrder);
  syncOrder();
})();
