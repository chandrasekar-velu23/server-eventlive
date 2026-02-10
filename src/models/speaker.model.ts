import mongoose, { Schema, Document } from "mongoose";

export interface ISpeaker extends Document {
    name: string;
    role: string;
    bio: string;
    avatar?: string;
    email?: string;
    socialLinks?: {
        linkedin?: string;
        twitter?: string;
        website?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const SpeakerSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        role: { type: String, required: true },
        bio: { type: String, required: true },
        avatar: { type: String },
        email: { type: String },
        socialLinks: {
            linkedin: String,
            twitter: String,
            website: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model<ISpeaker>("Speaker", SpeakerSchema);
