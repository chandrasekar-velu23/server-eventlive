import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: string;
  authProvider: "local" | "google";
  onboardingCompleted: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  // Profile Information
  bio?: string;
  avatar?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  };

  // Organizer Specific
  organizationName?: string;
  eventTypes?: string[];

  // System
  createdAt: Date;
  updatedAt: Date;

  // Auth Sessions (Persistent Login)
  activeSessions: {
    _id: mongoose.Types.ObjectId;
    tokenHash: string;
    ipAddress: string;
    userAgent: string;
    lastActive: Date;
    expiresAt: Date;
    createdAt: Date;
  }[];

  favorites: mongoose.Types.ObjectId[];
}

const AuthSessionSchema = new Schema({
  tokenHash: { type: String, required: true },
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
  lastActive: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      select: false, // 🔐 critical for security
    },

    role: {
      type: String,
      enum: ["User", "Organizer", "Attendee", "Admin"],
      default: "User",
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      required: true,
      default: "local",
    },

    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // Profile Fields
    bio: {
      type: String,
      maxlength: 500
    },
    avatar: String,
    organizationName: String,
    eventTypes: [String],
    socialLinks: {
      twitter: String,
      linkedin: String,
      facebook: String,
      instagram: String,
      website: String
    },

    // Auth Sessions Array
    activeSessions: {
      type: [AuthSessionSchema],
      default: []
    },

    favorites: [
      { type: Schema.Types.ObjectId, ref: 'Event' }
    ]
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
