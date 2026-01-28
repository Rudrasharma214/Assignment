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

export const Poll = model("Poll", PollSchema);
