(() => {
    "use strict";

    const STORAGE_KEY = "wandersite.compare.v1";
    const MAX_ITEMS = 3;
    const ID_PATTERN = /^[a-f0-9]{24}$/i;

    function cleanIds(value) {
        if (!Array.isArray(value)) return [];
        return [...new Set(value.filter((id) => typeof id === "string" && ID_PATTERN.test(id)).map((id) => id.toLowerCase()))].slice(0, MAX_ITEMS);
    }

    function readSelection() {
        try {
            return cleanIds(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"));
        } catch (_error) {
            return [];
        }
    }

    let selectedIds = readSelection();

    function saveSelection() {
        selectedIds = cleanIds(selectedIds);
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
        } catch (_error) {
            // The board still works for the current page if storage is unavailable.
        }
    }

    function makeButton(label, className) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = label;
        return button;
    }

    function createDock() {
        const dock = document.createElement("aside");
        dock.className = "compare-dock";
        dock.setAttribute("aria-label", "Stay comparison selection");
        dock.hidden = true;

        const copy = document.createElement("div");
        copy.className = "compare-dock-copy";

        const title = document.createElement("strong");
        title.textContent = "Your comparison";

        const status = document.createElement("span");
        status.className = "compare-dock-status";
        status.setAttribute("aria-live", "polite");

        copy.append(title, status);

        const actions = document.createElement("div");
        actions.className = "compare-dock-actions";

        const clearButton = makeButton("Clear", "compare-clear-button");
        const compareButton = makeButton("Compare stays", "compare-open-button");
        compareButton.disabled = true;

        actions.append(clearButton, compareButton);
        dock.append(copy, actions);
        document.body.appendChild(dock);

        return { dock, status, clearButton, compareButton };
    }

    function compareUrl() {
        return selectedIds.length ? "/listings/compare?ids=" + encodeURIComponent(selectedIds.join(",")) : "/listings/compare";
    }

    function refreshControls() {
        document.querySelectorAll("[data-compare-id]").forEach((button) => {
            const id = button.getAttribute("data-compare-id");
            const active = selectedIds.includes(id);
            button.classList.toggle("is-selected", active);
            button.setAttribute("aria-pressed", String(active));

            const label = button.querySelector(".compare-toggle-label");
            if (label) {
                label.textContent = active
                    ? (document.querySelector("[data-compare-page]") ? "Remove from compare" : "Added · remove")
                    : "Add to compare";
            }

            const icon = button.querySelector("i");
            if (icon) {
                icon.className = active ? "fa-solid fa-check" : "fa-solid fa-scale-balanced";
                icon.setAttribute("aria-hidden", "true");
            }
        });

        if (!dockElements) return;
        dockElements.dock.hidden = selectedIds.length === 0;
        dockElements.status.textContent = selectedIds.length < 2
            ? selectedIds.length + " of 3 selected · add " + (2 - selectedIds.length) + " more to compare"
            : selectedIds.length + " of 3 stays selected · ready to compare";
        dockElements.compareButton.disabled = selectedIds.length < 2;
        dockElements.compareButton.textContent = selectedIds.length >= 2
            ? "Compare " + selectedIds.length + " stays"
            : "Choose " + (2 - selectedIds.length) + " more";
    }

    let dockElements = null;

    function initialise() {
        const comparePage = Boolean(document.querySelector("[data-compare-page]"));

        // A shared URL is portable: hydrate the current browser's board from its IDs.
        if (comparePage) {
            const params = new URLSearchParams(window.location.search);
            const sharedIds = cleanIds((params.get("ids") || "").split(","));
            if (sharedIds.length) {
                selectedIds = sharedIds;
                saveSelection();
            }
        }

        if (!dockElements) dockElements = createDock();
        const elements = dockElements;

        elements.clearButton.addEventListener("click", () => {
            selectedIds = [];
            saveSelection();
            if (comparePage) {
                window.location.assign("/listings/compare");
                return;
            }
            refreshControls();
        });

        elements.compareButton.addEventListener("click", () => {
            if (selectedIds.length >= 2) window.location.assign(compareUrl());
        });

        document.addEventListener("click", (event) => {
            const button = event.target.closest("[data-compare-id]");
            if (!button) return;

            const id = button.getAttribute("data-compare-id");
            if (!ID_PATTERN.test(id || "")) return;

            if (selectedIds.includes(id)) {
                selectedIds = selectedIds.filter((item) => item !== id);
            } else {
                if (selectedIds.length >= MAX_ITEMS) {
                    elements.status.textContent = "You can compare up to three stays. Remove one first.";
                    return;
                }
                selectedIds.push(id);
            }

            saveSelection();
            if (comparePage) {
                window.location.assign(compareUrl());
                return;
            }
            refreshControls();
        });

        const copyButton = document.querySelector("[data-copy-compare]");
        if (copyButton) {
            copyButton.addEventListener("click", async () => {
                const originalText = copyButton.textContent;
                const shareUrl = window.location.href;
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(shareUrl);
                    } else {
                        const input = document.createElement("textarea");
                        input.value = shareUrl;
                        input.setAttribute("readonly", "");
                        input.style.position = "absolute";
                        input.style.left = "-9999px";
                        document.body.appendChild(input);
                        input.select();
                        const copied = document.execCommand("copy");
                        input.remove();
                        if (!copied) throw new Error("Clipboard unavailable");
                    }
                    copyButton.textContent = "Link copied";
                    copyButton.classList.add("is-copied");
                } catch (_error) {
                    copyButton.textContent = "Copy unavailable";
                }
                window.setTimeout(() => {
                    copyButton.textContent = originalText;
                    copyButton.classList.remove("is-copied");
                }, 1800);
            });
        }

        refreshControls();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialise, { once: true });
    } else {
        initialise();
    }

    window.addEventListener("storage", (event) => {
        if (event.key !== STORAGE_KEY) return;
        selectedIds = readSelection();
        refreshControls();
    });
})();
