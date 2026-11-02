"use strict";

function escapeText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldLine(line) {
  const parts = [];
  let current = "";
  let byteLength = 0;

  for (const character of line) {
    const characterBytes = Buffer.byteLength(character, "utf8");
    if (byteLength + characterBytes > 75) {
      parts.push(current);
      current = " " + character;
      byteLength = 1 + characterBytes;
    } else {
      current += character;
      byteLength += characterBytes;
    }
  }

  parts.push(current);
  return parts.join("\r\n");
}

function dateValue(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function nextDay(date) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

function buildTripCalendar(trip, now = new Date()) {
  const title = trip.title || "WanderSite trip";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WanderSite//Trip Itinerary//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + escapeText(title)
  ];

  for (const item of trip.items || []) {
    if (!item?.plannedDate || !item.listing) continue;

    const start = new Date(item.plannedDate);
    if (!Number.isFinite(start.getTime())) continue;
    const end = nextDay(start);
    const listing = item.listing;
    const stayTitle = listing.title || "Planned stay";
    const location = [listing.location, listing.country].filter(Boolean).join(", ");
    const description = [
      item.note,
      trip.destination ? "Trip: " + trip.destination : ""
    ].filter(Boolean).join("\n");

    lines.push(
      "BEGIN:VEVENT",
      "UID:" + String(item._id || "stay") + "@wandersite",
      "DTSTAMP:" + now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""),
      "DTSTART;VALUE=DATE:" + dateValue(start),
      "DTEND;VALUE=DATE:" + dateValue(end),
      "SUMMARY:" + escapeText(stayTitle),
      ...(location ? ["LOCATION:" + escapeText(location)] : []),
      ...(description ? ["DESCRIPTION:" + escapeText(description)] : []),
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

module.exports = { buildTripCalendar, escapeText, foldLine };
