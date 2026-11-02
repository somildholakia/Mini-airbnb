const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Trip = require("../models/trip");
const { tripSchema, tripItemSchema, tripOrderSchema } = require("../schema");
const { buildTripCalendar } = require("../utils/ical");
const { applyItemOrder } = require("../utils/trip-order");
const { getTripMapPoints } = require("../utils/trip-map");

async function main() {
  const owner = new mongoose.Types.ObjectId();
  const validTripInput = {
    trip: {
      title: "Japan spring journey",
      destination: "Tokyo and Kyoto",
      startDate: "2027-03-10",
      endDate: "2027-03-18"
    }
  };

  assert.equal(tripSchema.validate(validTripInput).error, undefined, "valid trip input should pass");
  assert.ok(
    tripSchema.validate({ trip: { ...validTripInput.trip, title: "x" } }).error,
    "trip titles shorter than three characters should fail"
  );
  assert.ok(
    tripSchema.validate({ trip: { ...validTripInput.trip, destination: "x".repeat(121) } }).error,
    "overlong destinations should fail"
  );
  assert.ok(
    tripSchema.validate({ trip: { ...validTripInput.trip, startDate: "not-a-date" } }).error,
    "invalid trip dates should fail"
  );
  assert.ok(
    tripSchema.validate({ trip: { ...validTripInput.trip, startDate: "2027-02-30" } }).error,
    "impossible calendar dates should fail"
  );
  assert.ok(
    tripSchema.validate({ trip: { ...validTripInput.trip, endDate: "2027-13-01" } }).error,
    "out-of-range calendar months should fail"
  );

  assert.equal(tripOrderSchema.validate({ itemIds: "0123456789abcdef01234567" }).error, undefined, "a single item order should pass");
  assert.ok(tripOrderSchema.validate({ itemIds: "not-an-id" }).error, "malformed item IDs should fail");
  assert.ok(tripOrderSchema.validate({ itemIds: "0123456789abcdef01234567," }).error, "empty order entries should fail");

  const orderItems = [
    { _id: "000000000000000000000001", position: 0 },
    { _id: "000000000000000000000002", position: 1 },
    { _id: "000000000000000000000003", position: 2 }
  ];
  applyItemOrder(orderItems, [
    "000000000000000000000003",
    "000000000000000000000001",
    "000000000000000000000002"
  ]);
  assert.deepEqual(orderItems.map((item) => item.position), [1, 2, 0], "requested order should map to stable zero-based positions");
  assert.throws(
    () => applyItemOrder(orderItems, [
      "000000000000000000000001",
      "000000000000000000000001",
      "000000000000000000000003"
    ]),
    /order is invalid/,
    "duplicate stop IDs should be rejected"
  );
  assert.throws(
    () => applyItemOrder(orderItems, [
      "000000000000000000000001",
      "000000000000000000000002"
    ]),
    /order is invalid/,
    "partial order payloads should be rejected"
  );
  assert.throws(
    () => applyItemOrder(orderItems, [
      "000000000000000000000001",
      "000000000000000000000002",
      "ffffffffffffffffffffffff"
    ]),
    /order is invalid/,
    "foreign stop IDs should be rejected"
  );

  const validItem = {
    item: {
      listingId: new mongoose.Types.ObjectId().toString(),
      plannedDate: "2027-03-12",
      note: "Reserve a table near the waterfront."
    }
  };
  assert.equal(tripItemSchema.validate(validItem).error, undefined, "valid itinerary items should pass");
  assert.ok(
    tripItemSchema.validate({ item: { ...validItem.item, listingId: "not-an-id" } }).error,
    "invalid listing IDs should fail"
  );
  assert.ok(
    tripItemSchema.validate({ item: { ...validItem.item, plannedDate: "2027-02-30" } }).error,
    "impossible itinerary dates should fail"
  );
  assert.ok(
    tripItemSchema.validate({ item: { ...validItem.item, note: "x".repeat(501) } }).error,
    "itinerary notes over 500 characters should fail"
  );

  const trip = new Trip({
    ...validTripInput.trip,
    owner
  });
  await trip.validate();
  assert.equal(trip.isPublic, false, "new trips should be private by default");
  assert.match(trip.inviteToken, /^[a-f0-9]{48}$/, "invite tokens should be high-entropy hex values");

  const secondTrip = new Trip({ title: "A second trip", owner });
  assert.notEqual(trip.inviteToken, secondTrip.inviteToken, "each trip should receive a distinct invite token");

  const invalidDates = new Trip({
    title: "Backwards date range",
    owner,
    startDate: new Date("2027-03-18T00:00:00.000Z"),
    endDate: new Date("2027-03-10T00:00:00.000Z")
  });
  await assert.rejects(
    () => invalidDates.validate(),
    (error) => error.name === "ValidationError" && Boolean(error.errors.endDate),
    "trip end dates must not precede their start dates"
  );

const mapPoints = getTripMapPoints([
  {
    _id: "itinerary-1",
    listing: {
      _id: "listing-1",
      title: "Tokyo stay",
      location: "Tokyo",
      country: "Japan",
      locationCoordinates: { type: "Point", coordinates: [139.6503, 35.6762] }
    }
  },
  {
    _id: "itinerary-2",
    listing: {
      _id: "listing-2",
      title: "Another Tokyo stay",
      location: "Tokyo",
      country: "Japan"
    }
  },
  {
    _id: "itinerary-3",
    listing: {
      _id: "listing-3",
      title: "Unknown destination",
      location: "Atlantis",
      country: "Ocean"
    }
  },
  { _id: "itinerary-4", listing: null }
]);
assert.deepEqual(mapPoints.map((point) => point.itemId), ["itinerary-1", "itinerary-2"], "mapped stops should retain itinerary order and skip unknown locations");
assert.deepEqual(mapPoints[0].coordinates, [139.6503, 35.6762], "stored GeoJSON coordinates should be used");
assert.deepEqual(mapPoints[1].coordinates, [139.6503, 35.6762], "known city coordinates should be used as a fallback");
assert.ok(mapPoints.every((point) => !("address" in point)), "trip map points should not expose property addresses");

const calendar = buildTripCalendar({
    title: "Japan, spring",
    destination: "Japan",
    items: [
      {
        _id: "stay123",
        plannedDate: new Date("2027-03-12T00:00:00.000Z"),
        listing: {
          title: "Kyoto, Stay; Main\\Wing",
          location: "Kyoto",
          country: "Japan"
        },
        note: "Check in at 3pm\nBring pass; call desk\\first"
      },
      {
        _id: "stay-unscheduled",
        plannedDate: null,
        listing: { title: "Unscheduled stay" }
      }
    ]
  }, new Date("2027-01-01T00:00:00.000Z"));

  assert.ok(calendar.includes("BEGIN:VCALENDAR\r\n"));
  assert.ok(calendar.includes("DTSTART;VALUE=DATE:20270312"));
  assert.ok(calendar.includes("DTEND;VALUE=DATE:20270313"));
  assert.ok(calendar.includes("SUMMARY:Kyoto\\, Stay\\; Main\\\\Wing"));
  assert.ok(calendar.includes("DESCRIPTION:Check in at 3pm\\nBring pass\\; call desk\\\\first\\nTrip: Japan"));
  assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, 1, "unscheduled stays should not become calendar events");
  assert.ok(calendar.endsWith("END:VCALENDAR\r\n"));

  const longCalendar = buildTripCalendar({ title: "Japan ".repeat(30), items: [] }, new Date("2027-01-01T00:00:00.000Z"));
  const physicalLines = longCalendar.split("\r\n").filter(Boolean);
  assert.ok(physicalLines.every((line) => Buffer.byteLength(line, "utf8") <= 75), "calendar lines should be folded at 75 UTF-8 octets");
  assert.ok(longCalendar.includes("\r\n "), "folded continuation lines should start with a space");

  process.stdout.write("Validated trip access defaults, date ranges, invite tokens, itinerary input limits and iCalendar export.\n");
}

main().catch((error) => {
  process.stderr.write(error.stack + "\n");
  process.exitCode = 1;
});
