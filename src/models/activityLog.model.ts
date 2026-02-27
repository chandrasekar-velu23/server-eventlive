
import mongoose, { Schema, Document } from "mongoose";

export interface IActivityLog extends Document {
    user: mongoose.Schema.Types.ObjectId;
    action: string;
    details?: Record<string, any>;
    createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        action: {
            type: String,
            required: true,
        },
        details: {
            type: Schema.Types.Mixed,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
