const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Trip = require("../models/trip");
const { tripSchema, tripItemSchema } = require("../schema");
const { buildTripCalendar } = require("../utils/ical");

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
