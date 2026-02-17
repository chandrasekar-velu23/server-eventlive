import mongoose, { Schema, Document } from "mongoose";

export interface IParticipantSession {
  userId: string;
  joinedAt: Date;
  role: 'organizer' | 'speaker' | 'attendee' | 'moderator';
  isMuted: boolean;
  videoEnabled: boolean;
  screenshareActive: boolean;
  reactions: string[];
  handRaised: boolean;
  questionsAsked: number;
  leftAt?: Date;
}

// Alias for backwards compatibility if needed, though controller uses IParticipantSession
export type IParticipant = IParticipantSession;

export interface ISession extends Document {
  eventId: mongoose.Types.ObjectId;
  organizerId: mongoose.Types.ObjectId;
  title: string;
  sessionCode: string;
  recordingUrl?: string;
  recordingStatus?: 'processing' | 'processed' | 'failed';
  description?: string;
  scheduledStartTime: Date;
  duration: number; // in minutes
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  actualStartTime?: Date;
  actualEndTime?: Date;

  // Settings
  requireApproval: boolean;
  allowRecording: boolean;
  chatEnabled: boolean;
  pollsEnabled: boolean;
  qaEnabled: boolean;
  maxParticipants?: number;

  participants: IParticipantSession[];

  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  joinedAt: { type: Date, default: Date.now },
  role: { type: String, enum: ['organizer', 'speaker', 'attendee', 'moderator'], default: 'attendee' },
  isMuted: { type: Boolean, default: true },
  videoEnabled: { type: Boolean, default: false },
  screenshareActive: { type: Boolean, default: false },
  reactions: [String],
  handRaised: { type: Boolean, default: false },
  questionsAsked: { type: Number, default: 0 },
  leftAt: { type: Date }
}, { _id: false });

const SessionSchema = new Schema<ISession>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    sessionCode: { type: String, required: true, unique: true },
    recordingUrl: { type: String },
    recordingStatus: { type: String, enum: ['processing', 'processed', 'failed'] },
    description: { type: String },
    scheduledStartTime: { type: Date, required: true },
    duration: { type: Number, required: true }, // minutes
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended', 'cancelled'],
      default: 'scheduled'
    },
    actualStartTime: Date,
    actualEndTime: Date,

    // Settings
    requireApproval: { type: Boolean, default: false },
    allowRecording: { type: Boolean, default: true },
    chatEnabled: { type: Boolean, default: true },
    pollsEnabled: { type: Boolean, default: true },
    qaEnabled: { type: Boolean, default: true },
    maxParticipants: Number,

    participants: [ParticipantSchema],
  },
  { timestamps: true }
);

export default mongoose.model<ISession>("Session", SessionSchema);
