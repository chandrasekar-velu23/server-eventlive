import mongoose, { Schema, Document } from 'mongoose';

export interface IPollOption {
  id: string;
  text: string;
}

export interface IPollRespondent {
  userId: mongoose.Types.ObjectId;
  answers: number[];
  votedAt: Date;
}

export interface IPoll extends Document {
  sessionId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  question: string;
  options: IPollOption[];
  isActive: boolean;
  allowMultipleAnswers: boolean;
  showResultsLive: boolean;
  respondents: IPollRespondent[];
  createdAt: Date;
  updatedAt: Date;
  endsAt: Date;
}

const PollOptionSchema = new Schema<IPollOption>(
  {
    id: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Poll option text is required'],
      maxlength: 500,
    },
  },
  { _id: false }
);

const PollRespondentSchema = new Schema<IPollRespondent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    answers: {
      type: [Number],
      required: true,
    },
    votedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const PollSchema = new Schema<IPoll>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Poll creator is required'],
    },
    question: {
      type: String,
      required: [true, 'Poll question is required'],
      maxlength: 500,
    },
    options: {
      type: [PollOptionSchema],
      required: [true, 'At least one option is required'],
      validate: {
        validator: (v) => v && v.length >= 2,
        message: 'Poll must have at least 2 options',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    allowMultipleAnswers: {
      type: Boolean,
      default: false,
    },
    showResultsLive: {
      type: Boolean,
      default: true,
    },
    respondents: [PollRespondentSchema],
    endsAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for queries
PollSchema.index({ sessionId: 1, isActive: 1 });
PollSchema.index({ createdBy: 1 });

export default mongoose.model<IPoll>('Poll', PollSchema);
