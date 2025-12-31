import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    editedAt: { type: Date },
    isRead: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
