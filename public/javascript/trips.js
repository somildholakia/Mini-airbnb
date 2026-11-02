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
})();
