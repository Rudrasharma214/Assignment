import { Schema, model, Types } from "mongoose";

const VoteSchema = new Schema(
  {
    pollId: {
      type: Types.ObjectId,
      ref: "Poll",
      required: true
    },

    studentName: {
      type: String,
      required: true
    },

    optionId: {
      type: Types.ObjectId,
      required: true
    }
  },
  {
    timestamps: true
  }
);

VoteSchema.index(
  { pollId: 1, studentName: 1 },
  { unique: true }
);

export const Vote = model("Vote", VoteSchema);
