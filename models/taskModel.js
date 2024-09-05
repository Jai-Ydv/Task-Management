const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
});

// Create indexes
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ user: 1, assignedTo: 1 });

module.exports = mongoose.model('Task', taskSchema);
