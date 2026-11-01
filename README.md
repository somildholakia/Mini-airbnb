# WanderSite

WanderSite is an Express, EJS, MongoDB and Cloudinary-based stay-discovery app.

## Run locally

1. Use Node.js 22 or newer.
2. Install dependencies with `npm ci`.
3. Create a `.env` file with the variables below.
4. Start the server with `npm start`.

Required environment variables:

- `ATLASTDB_URL` — MongoDB connection string.
- `SECRET` — a long, random session secret.
- `CLOUD_NAME` — Cloudinary cloud name.
- `CLOUD_API_KEY` — Cloudinary API key.
- `CLOUD_API_SECRET` — Cloudinary API secret.

## Health endpoints

- `GET /health` — lightweight liveness check for Render and uptime monitors.
- `GET /ready` — readiness check; returns HTTP 503 while MongoDB is disconnected.
- `GET /listings/map-data` — public, limited listing data for the map.

The map uses Leaflet and OpenStreetMap tiles and does not require a paid map API key. Existing common destinations use city-level coordinates. New or edited locations can be geocoded through the OpenStreetMap Nominatim service; lookups are throttled and failures do not prevent a listing from being saved.

## Render

Set the Render web service health check path to `/health`, use `npm install` or `npm ci` as the build command, and `npm start` as the start command. Render injects the listening port through `PORT`.

A Render Free web service is not an always-on production service: it can spin down after 15 minutes without inbound traffic and can be restarted for platform maintenance. The GitHub Actions warm-up workflow in `.github/workflows/keep-alive.yml` can send a best-effort health request every 10 minutes after the repository variable `SITE_URL` is configured. Scheduled GitHub Actions can be delayed, so this is not a 100% uptime guarantee. A paid always-on instance is the reliable option for production availability.


## Global hotel collection

WanderSite includes an editorial discovery catalog of 576 named hotel properties across destinations worldwide. The first 100 entries follow the 2026 edition of The 50 Best Hotels; the broader collection is a WanderSite editorial selection and is not an independently ranked list.

Ranking sources:
- The 50 Best Hotels 2026, ranks 1–50: https://www.the50.com/stories/News/the-50-best-hotels-2026-the-list-revealed.html
- The 50 Best Hotels 2026, extended ranks 51–100: https://www.the50.com/stories/News/the-50-best-hotels-2026-the-51-100-list.html

The catalog is stored in `data/curated-hotels.json`. To seed a database safely, set `ATLASTDB_URL` and run:

```bash
node scripts/seed-hotels.js
```

The seeder uses stable hotel slugs and upserts only curated records. It does not delete or overwrite member-created listings, user accounts or reviews. Curated hotel profiles do not invent ratings, prices or live availability. Hotel rates, facilities and availability must be confirmed directly with each property.

Catalog images are general editorial destination imagery, not verified photographs of each named property. Hotel profile links open an external search for current property information; WanderSite does not currently provide live booking checkout or reservation inventory.
