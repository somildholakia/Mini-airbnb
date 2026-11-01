(() => {
    const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

    function addBaseTiles(map) {
        L.tileLayer(tileUrl, {
            maxZoom: 19,
            attribution
        }).addTo(map);
    }

    function coordinatesToLatLng(coordinates) {
        if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;

        const longitude = Number(coordinates[0]);
        const latitude = Number(coordinates[1]);

        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
        if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

        return [latitude, longitude];
    }

    function makePopup(listing) {
        const wrapper = document.createElement("div");
        const title = document.createElement("div");
        const location = document.createElement("div");
        const link = document.createElement("a");

        title.className = "map-popup-title";
        title.textContent = listing.title || "WanderSite stay";

        location.className = "map-popup-location";
        location.textContent = [listing.location, listing.country].filter(Boolean).join(", ");

        link.className = "map-popup-link";
        link.href = "/listings/" + encodeURIComponent(listing.id);
        link.textContent = "View stay";

        wrapper.append(title, location, link);
        return wrapper;
    }

    function makeListItem(listing) {
        const link = document.createElement("a");
        const title = document.createElement("span");
        const location = document.createElement("span");
        const price = document.createElement("span");

        link.className = "map-list-item";
        link.href = "/listings/" + encodeURIComponent(listing.id);

        title.className = "map-list-title";
        title.textContent = listing.title || "WanderSite stay";

        location.className = "map-list-location";
        location.textContent = [listing.location, listing.country].filter(Boolean).join(", ") || "Location not specified";

        price.className = "map-list-price";
        price.textContent = "₹" + Number(listing.price || 0).toLocaleString("en-IN") + " / night";

        link.append(title, location, price);
        return link;
    }

    async function initListingsMap(element) {
        const listContainer = document.getElementById("map-list");
        const countLabel = document.getElementById("map-count");

        const map = L.map(element, { scrollWheelZoom: false }).setView([20, 0], 2);
        addBaseTiles(map);

        try {
            const response = await fetch(element.dataset.api || "/listings/map-data", {
                headers: { "Accept": "application/json" }
            });
            if (!response.ok) throw new Error("Map data request failed");

            const payload = await response.json();
            const listings = Array.isArray(payload.listings) ? payload.listings : [];
            const bounds = [];
            let mappedCount = 0;

            if (listContainer) listContainer.replaceChildren();

            listings.forEach((listing) => {
                if (listContainer) listContainer.appendChild(makeListItem(listing));

                const latLng = coordinatesToLatLng(listing.coordinates);
                if (!latLng) return;

                const marker = L.marker(latLng).addTo(map);
                marker.bindPopup(makePopup(listing));
                bounds.push(latLng);
                mappedCount += 1;
            });

            if (countLabel) {
                countLabel.textContent = mappedCount + " mapped " + (mappedCount === 1 ? "location" : "locations");
            }

            if (listings.length === 0 && listContainer) {
                const empty = document.createElement("p");
                empty.className = "map-empty-state";
                empty.textContent = "No stays yet. Add a listing to start exploring.";
                listContainer.appendChild(empty);
            } else if (mappedCount === 0 && listContainer) {
                const note = document.createElement("p");
                note.className = "map-empty-state";
                note.textContent = "Some stays need a city or area before they can be placed on the map.";
                listContainer.appendChild(note);
            }

            if (bounds.length === 1) {
                map.setView(bounds[0], 10);
            } else if (bounds.length > 1) {
                map.fitBounds(bounds, { padding: [35, 35], maxZoom: 9 });
            }
        } catch (error) {
            if (countLabel) countLabel.textContent = "Map unavailable";
            if (listContainer) {
                const note = document.createElement("p");
                note.className = "map-empty-state";
                note.textContent = "We couldn't load the map right now. The stay listings are still available below.";
                listContainer.replaceChildren(note);
            }
        }
    }

    function initDetailMap(element) {
        const latLng = coordinatesToLatLng(
            String(element.dataset.coordinates || "").split(",").map(Number)
        );

        if (!latLng) {
            element.classList.add("map-unavailable");
            element.textContent = "Map coordinates are not available for this location yet.";
            return;
        }

        const map = L.map(element, { scrollWheelZoom: false }).setView(latLng, 11);
        addBaseTiles(map);

        const marker = L.marker(latLng).addTo(map);
        const popup = document.createElement("div");
        const title = document.createElement("strong");
        const location = document.createElement("div");

        title.textContent = element.dataset.title || "WanderSite stay";
        location.textContent = element.dataset.location || "Approximate location";
        popup.append(title, location);
        marker.bindPopup(popup).openPopup();
    }

    document.addEventListener("DOMContentLoaded", () => {
        if (typeof L === "undefined") return;

        const listingsMap = document.getElementById("listings-map");
        if (listingsMap) initListingsMap(listingsMap);

        const detailMap = document.getElementById("listing-detail-map");
        if (detailMap) initDetailMap(detailMap);
    });
})();
