import mongoose, { Schema } from "mongoose";

const CampaignSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 4096,
    },
    totalUsers: {
      type: Number,
      required: true,
    },
    successCount: {
      type: Number,
      required: true,
    },
    failedCount: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false }
);

const Campaign =
  mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema);

export default Campaign;
