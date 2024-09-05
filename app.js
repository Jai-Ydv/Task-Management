const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const cron = require('node-cron');
const Task=require("./models/taskModel")
const { sendEmail } = require('./config/nodemailer');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

cron.schedule('0 9 * * *', async () => {
    try {
        const tasks = await Task.find({
            dueDate: { $gte: new Date(), $lt: new Date(new Date().setDate(new Date().getDate() + 1)) },
            status: { $ne: 'Completed' }
        });

        tasks.forEach(async (task) => {
            const assignedUser = await User.findById(task.assignedTo);
            if (assignedUser && assignedUser.email) {
                sendEmail(
                    assignedUser.email,
                    'Task Due Reminder',
                    `The task "${task.title}" is due tomorrow. Please ensure it's completed on time.`
                );
            }
        });

    } catch (err) {
        console.error('Error in due date reminder cron job:', err);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
