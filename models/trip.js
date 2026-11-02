const crypto = require("node:crypto");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const itineraryItemSchema = new Schema({
  listing: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
  plannedDate: { type: Date, default: null },
  note: { type: String, trim: true, maxlength: 500, default: "" },
  addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  addedAt: { type: Date, default: Date.now },
  position: { type: Number, min: 0, default: 0 }
});

const collaboratorSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const tripSchema = new Schema({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
  destination: { type: String, trim: true, maxlength: 120, default: "" },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  collaborators: { type: [collaboratorSchema], default: [] },
  items: { type: [itineraryItemSchema], default: [] },
  isPublic: { type: Boolean, default: false },
  shareToken: { type: String, default: undefined, select: false },
  inviteToken: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(24).toString("hex"),
    select: false
  }
}, { timestamps: true });

tripSchema.pre("validate", function validateTripDates() {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate("endDate", "The trip end date must be on or after its start date.");
  }
});

tripSchema.index({ owner: 1, updatedAt: -1 });
tripSchema.index({ "collaborators.user": 1, updatedAt: -1 });
tripSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Trip", tripSchema);
