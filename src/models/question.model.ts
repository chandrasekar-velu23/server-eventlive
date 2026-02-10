import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  sessionId: mongoose.Types.ObjectId;
  askedBy: mongoose.Types.ObjectId;
  content: string;
  isAnswered: boolean;
  answeredBy?: mongoose.Types.ObjectId;
  answer?: string;
  upvotes: mongoose.Types.ObjectId[];
  priority: 'low' | 'medium' | 'high';
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    askedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Question asker is required'],
    },
    content: {
      type: String,
      required: [true, 'Question content is required'],
      maxlength: 1000,
    },
    isAnswered: {
      type: Boolean,
      default: false,
    },
    answeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    answer: {
      type: String,
      maxlength: 2000,
    },
    upvotes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
QuestionSchema.index({ sessionId: 1, isAnswered: 1 });
QuestionSchema.index({ askedBy: 1 });

export default mongoose.model<IQuestion>('Question', QuestionSchema);
