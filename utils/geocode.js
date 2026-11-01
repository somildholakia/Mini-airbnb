const knownPlaces = {
    "malibu": [-118.7798, 34.0259],
    "new york city": [-74.0060, 40.7128],
    "new york": [-74.0060, 40.7128],
    "aspen": [-106.8175, 39.1911],
    "florence": [11.2558, 43.7696],
    "portland": [-122.6784, 45.5152],
    "cancun": [-86.8515, 21.1619],
    "lake tahoe": [-120.0324, 39.0968],
    "los angeles": [-118.2437, 34.0522],
    "verbier": [7.2280, 46.0960],
    "serengeti national park": [34.8333, -2.3333],
    "amsterdam": [4.9041, 52.3676],
    "fiji": [178.0650, -17.7134],
    "cotswolds": [-1.8433, 51.8330],
    "boston": [-71.0589, 42.3601],
    "bali": [115.1889, -8.4095],
    "banff": [-115.5708, 51.1784],
    "miami": [-80.1918, 25.7617],
    "phuket": [98.3923, 7.8804],
    "scottish highlands": [-4.2247, 57.4778],
    "dubai": [55.2708, 25.2048],
    "montana": [-110.3626, 46.8797],
    "mykonos": [25.3289, 37.4467],
    "costa rica": [-83.7534, 9.7489],
    "tokyo": [139.6503, 35.6762],
    "new hampshire": [-71.5724, 43.1939],
    "maldives": [73.2207, 3.2028],
    "mumbai": [72.8777, 19.0760],
    "dahisar": [72.8562, 19.2502],
    "goa": [73.8278, 15.2993],
    "panaji": [73.8278, 15.4909],
    "jaipur": [75.7873, 26.9124],
    "agra": [78.0081, 27.1767],
    "delhi": [77.2090, 28.6139],
    "new delhi": [77.2090, 28.6139],
    "pune": [73.8567, 18.5204],
    "bengaluru": [77.5946, 12.9716],
    "bangalore": [77.5946, 12.9716],
    "udaipur": [73.7125, 24.5854],
    "manali": [77.1887, 32.2432],
    "shimla": [77.1734, 31.1048],
    "varanasi": [82.9739, 25.3176],
    "kochi": [76.2673, 9.9312],
    "kerala": [76.2711, 10.8505],
    "hyderabad": [78.4867, 17.3850],
    "chennai": [80.2707, 13.0827],
    "kolkata": [88.3639, 22.5726],
    "beijing": [116.4074, 39.9042],
    "nice": [7.2620, 43.7102],
    "amalfi": [14.6027, 40.6340],
    "sumba island": [119.9, -9.65],
    "madrid": [-3.7038, 40.4168],
    "positano": [14.4840, 40.6280],
    "playa del carmen": [-87.0739, 20.6296],
    "bodrum": [27.4290, 37.0344],
    "lake como": [9.2610, 45.9900],
    "monte carlo": [7.4246, 43.7396],
    "cabo san lucas": [-109.9167, 22.8905],
    "riviera maya": [-87.0, 20.6],
    "cape town": [18.4241, -33.9249],
    "sydney": [151.2093, -33.8688],
    "melbourne": [144.9631, -37.8136],
    "singapore": [103.8198, 1.3521],
    "hong kong": [114.1694, 22.3193]
};

const geocodeCache = new Map();
let geocodeQueue = Promise.resolve();
let lastGeocodeRequestAt = 0;

function normalizePlace(value) {
    return String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getKnownCoordinates(location, country) {
    const normalizedLocation = normalizePlace(location);
    if (!normalizedLocation) return null;

    const match = knownPlaces[normalizedLocation];
    if (!match) return null;

    return [...match];
}

function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function geocodeLocation(location, country) {
    const knownCoordinates = getKnownCoordinates(location, country);
    if (knownCoordinates) return Promise.resolve(knownCoordinates);

    const query = [location, country].filter(Boolean).join(", ").trim();
    const cacheKey = normalizePlace(query);

    if (!cacheKey) return Promise.resolve(null);
    if (geocodeCache.has(cacheKey)) {
        return Promise.resolve(geocodeCache.get(cacheKey));
    }

    const lookup = geocodeQueue.then(async () => {
        if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

        const waitTime = Math.max(0, 1100 - (Date.now() - lastGeocodeRequestAt));
        if (waitTime > 0) await delay(waitTime);

        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", query);
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("limit", "1");

        try {
            const response = await fetch(url, {
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "WanderSite/1.0 (+https://github.com/somildholakia/Mini-airbnb)"
                },
                signal: AbortSignal.timeout(5000)
            });
            lastGeocodeRequestAt = Date.now();

            if (!response.ok) {
                geocodeCache.set(cacheKey, null);
                return null;
            }

            const results = await response.json();
            const firstResult = Array.isArray(results) ? results[0] : null;
            if (!firstResult) {
                geocodeCache.set(cacheKey, null);
                return null;
            }

            const longitude = Number(firstResult.lon);
            const latitude = Number(firstResult.lat);
            const coordinates = [longitude, latitude];

            if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
                geocodeCache.set(cacheKey, null);
                return null;
            }

            geocodeCache.set(cacheKey, coordinates);
            return coordinates;
        } catch (error) {
            // Geocoding is an enhancement, not a reason to reject a valid stay.
            geocodeCache.set(cacheKey, null);
            return null;
        }
    });

    geocodeQueue = lookup.then(() => undefined, () => undefined);
    return lookup;
}

module.exports = {
    getKnownCoordinates,
    geocodeLocation
};
