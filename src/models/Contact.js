import mongoose, { Schema } from "mongoose";

const ContactSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    chatId: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

ContactSchema.index({ userId: 1, phone: 1 }, { unique: true });

const Contact = mongoose.models.Contact || mongoose.model("Contact", ContactSchema);

export default Contact;
