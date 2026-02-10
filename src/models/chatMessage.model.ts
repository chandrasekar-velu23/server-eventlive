import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  sessionId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType: 'text' | 'system' | 'announcement';
  mentions?: mongoose.Types.ObjectId[];
  reactions?: { emoji: string; count: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    senderName: {
      type: String,
      required: [true, 'Sender name is required'],
    },
    senderAvatar: String,
    content: {
      type: String,
      required: [true, 'Message content is required'],
      minlength: [1, 'Message cannot be empty'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      trim: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'system', 'announcement'],
      default: 'text',
    },
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    reactions: [
      {
        emoji: String,
        count: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
ChatMessageSchema.index({ sessionId: 1, createdAt: -1 });
ChatMessageSchema.index({ senderId: 1 });

// TTL index - automatically delete messages after 30 days
ChatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
