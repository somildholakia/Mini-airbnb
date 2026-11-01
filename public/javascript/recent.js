(() => {
    "use strict";

    const STORAGE_KEY = "wandersite.recent.v1";
    const MAX_ITEMS = 10;
    const ID_PATTERN = /^[a-f0-9]{24}$/i;
    const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=480&q=75";

    function cleanIds(value) {
        if (!Array.isArray(value)) return [];
        return [...new Set(value.filter((id) => typeof id === "string" && ID_PATTERN.test(id)).map((id) => id.toLowerCase()))].slice(0, MAX_ITEMS);
    }

    function readHistory() {
        try {
            return cleanIds(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"));
        } catch (_error) {
            return [];
        }
    }

    function writeHistory(ids) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanIds(ids)));
        } catch (_error) {
            // Browsing still works if private storage is unavailable.
        }
    }

    function rememberCurrentStay() {
        const marker = document.querySelector("[data-recent-view-id]");
        if (!marker) return;
        const id = marker.getAttribute("data-recent-view-id");
        if (!ID_PATTERN.test(id || "")) return;
        writeHistory([id, ...readHistory().filter((item) => item !== id)]);
    }

    function createCard(listing) {
        const link = document.createElement("a");
        link.className = "recently-viewed-card";
        link.href = "/listings/" + encodeURIComponent(listing.id);

        const image = document.createElement("img");
        image.src = listing.imageUrl || FALLBACK_IMAGE;
        image.alt = "Editorial destination image for " + (listing.title || "WanderSite stay");
        image.loading = "lazy";
        image.onerror = () => { image.onerror = null; image.src = FALLBACK_IMAGE; };

        const copy = document.createElement("span");
        copy.className = "recently-viewed-copy";

        const title = document.createElement("strong");
        title.textContent = listing.title || "WanderSite stay";

        const place = document.createElement("span");
        place.textContent = [listing.location, listing.country].filter(Boolean).join(", ") || "Destination";

        const meta = document.createElement("small");
        meta.textContent = listing.rankingYear && listing.curationRank
            ? "2026 · #" + listing.curationRank + " in 50 Best"
            : (listing.isCurated ? "WanderSite editorial selection" : "Community stay");

        copy.append(title, place, meta);
        link.append(image, copy);
        return link;
    }

    async function renderRecentlyViewed() {
        const section = document.getElementById("recently-viewed");
        const grid = document.getElementById("recently-viewed-grid");
        if (!section || !grid) return;

        const ids = readHistory();
        if (!ids.length) {
            section.hidden = true;
            return;
        }

        try {
            const response = await fetch("/listings/recent-data?ids=" + encodeURIComponent(ids.join(",")), {
                headers: { "Accept": "application/json" }
            });
            if (!response.ok) throw new Error("Recent stays request failed");

            const payload = await response.json();
            const listings = Array.isArray(payload.listings) ? payload.listings : [];
            grid.replaceChildren(...listings.map(createCard));
            section.hidden = listings.length === 0;
        } catch (_error) {
            section.hidden = true;
        }
    }

    function initialise() {
        rememberCurrentStay();

        const clearButton = document.querySelector("[data-clear-recent]");
        if (clearButton) {
            clearButton.addEventListener("click", () => {
                writeHistory([]);
                const section = document.getElementById("recently-viewed");
                if (section) section.hidden = true;
            });
        }

        renderRecentlyViewed();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialise, { once: true });
    } else {
        initialise();
    }

    window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY) renderRecentlyViewed();
    });
})();
