import mongoose, { Schema, Document } from "mongoose";

export interface IEventChangeLog extends Document {
    eventId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    userName: string;
    userEmail: string;
    changeType: "created" | "updated" | "deleted";
    field: string;
    oldValue: any;
    newValue: any;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
}

const EventChangeLogSchema = new Schema<IEventChangeLog>({
    eventId: {
        type: Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    changeType: {
        type: String,
        enum: ["created", "updated", "deleted"],
        required: true
    },
    field: {
        type: String,
        required: true
    },
    oldValue: {
        type: Schema.Types.Mixed
    },
    newValue: {
        type: Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    }
}, {
    timestamps: true
});

// Index for efficient querying
EventChangeLogSchema.index({ eventId: 1, timestamp: -1 });
EventChangeLogSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model<IEventChangeLog>("EventChangeLog", EventChangeLogSchema);
