import mongoose, { Schema, Document } from "mongoose";

export interface IAttendanceLog extends Document {
    eventId: mongoose.Types.ObjectId;
    sessionId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    userEmail: string;
    userName: string;
    checkInTime: Date;
    checkOutTime?: Date;
    durationMinutes?: number;
    ipAddress?: string;
    userAgent?: string;
    status: "active" | "completed";
    metadata?: {
        browser?: string;
        os?: string;
        device?: string;
    };
}

const AttendanceLogSchema = new Schema<IAttendanceLog>({
    eventId: {
        type: Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        index: true
    },
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: "Session",
        required: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    userEmail: {
        type: String,
        required: true,
        index: true
    },
    userName: {
        type: String,
        required: true
    },
    checkInTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    checkOutTime: {
        type: Date
    },
    durationMinutes: {
        type: Number,
        default: 0
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    status: {
        type: String,
        enum: ["active", "completed"],
        default: "active"
    },
    metadata: {
        browser: String,
        os: String,
        device: String
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
AttendanceLogSchema.index({ eventId: 1, checkInTime: -1 });
AttendanceLogSchema.index({ userId: 1, checkInTime: -1 });
AttendanceLogSchema.index({ sessionId: 1, status: 1 });
AttendanceLogSchema.index({ userEmail: 1, eventId: 1 });

// Calculate duration before saving
AttendanceLogSchema.pre('save', function (next) {
    if (this.checkOutTime && this.checkInTime) {
        const duration = (this.checkOutTime.getTime() - this.checkInTime.getTime()) / 60000;
        this.durationMinutes = Math.round(duration);
        this.status = "completed";
    }
    next();
});

export default mongoose.model<IAttendanceLog>("AttendanceLog", AttendanceLogSchema);
