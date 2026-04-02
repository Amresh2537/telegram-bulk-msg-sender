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
    contentType: {
      type: String,
      enum: ["text", "photo", "video", "document"],
      default: "text",
    },
    mediaUrl: {
      type: String,
      trim: true,
      default: "",
    },
    parseMode: {
      type: String,
      enum: ["HTML", "MarkdownV2"],
      default: "HTML",
    },
    disableLinkPreview: {
      type: Boolean,
      default: false,
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
