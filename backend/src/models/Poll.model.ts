import { Schema, model } from "mongoose";

const OptionSchema = new Schema(
  {
    text: {
      type: String,
      required: true
    }
  },
  { _id: true }
);

const PollSchema = new Schema(
  {
    question: {
      type: String,
      required: true
    },

    options: {
      type: [OptionSchema],
      required: true
    },

    startTime: {
      type: Date,
      required: true
    },

    startedAt: {
      type: Date,
      required: true,
      default: () => new Date()
    },

    duration: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "ENDED"],
      default: "ACTIVE"
    }
  },
  {
    timestamps: true
  }
);

PollSchema.index({ status: 1, createdAt: -1 });

export const Poll = model("Poll", PollSchema);

