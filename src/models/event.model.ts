import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  organizerId: mongoose.Types.ObjectId;
  sessionCode: string;
  shareableLink: string;
  coverImage?: string;
  // New fields
  shortSummary?: string;
  timezone?: string;
  category?: string;
  accessType?: 'Free' | 'Paid' | 'Invite-only';
  capacity?: number;
  organizerDisplayName?: string;
  organizerLogo?: string;
  brandAccentColor?: string;
  status: 'Draft' | 'Published';

  type?: string;
  visibility?: 'public' | 'private';
  attendees?: mongoose.Types.ObjectId[];
  speakers?: mongoose.Types.ObjectId[];
  agenda?: {
    startTime: string;
    endTime: string;
    title: string;
    description: string;
    speakerId?: mongoose.Types.ObjectId;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

const EventSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  shortSummary: { type: String },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  timezone: { type: String, default: "UTC" },
  organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  organizerDisplayName: { type: String },
  organizerLogo: { type: String },
  brandAccentColor: { type: String },

  sessionCode: { type: String, unique: true, required: true },
  shareableLink: { type: String },
  coverImage: { type: String },

  category: { type: String, default: "Webinar" }, // Webinar, Workshop, etc.
  accessType: { type: String, enum: ['Free', 'Paid', 'Invite-only'], default: 'Free' },
  capacity: { type: Number },
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' },

  type: { type: String, default: "virtual" },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  attendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  speakers: [{ type: Schema.Types.ObjectId, ref: 'Speaker' }],
  agenda: [{
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    speakerId: { type: Schema.Types.ObjectId, ref: 'Speaker' }
  }],
}, { timestamps: true });

export default mongoose.model<IEvent>('Event', EventSchema);