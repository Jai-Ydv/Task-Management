const Task = require('../models/taskModel');
const User=require("../models/userModel")
const redisClient = require('../config/redisClient');
const { sendEmail } = require('../config/nodemailer');

exports.createTask = async (req, res) => {
    const { title, description, dueDate, priority,userId } = req.body;
    try {
        const task = new Task({
            title,
            description,
            dueDate,
            priority,
            user: req.user.id, 
            assignedBy: userId ? req.user.role === 'Manager' || req.user.role === 'Admin' ? req.user.id : null : null,
            assignedTo: userId ? userId : null,
        });
        await task.save();
        res.status(201).json(task);
    } catch (err) {
        res.status(500).json({ msg: err });
    }
};

exports.getTasks = async (req, res) => {

    const userId = req.user.id;
    const cacheKey = `tasks:${userId}`;
    try {
        const cachedData=await redisClient.get(cacheKey)
        if(cachedData){
            console.log("data from cached")
            return res.json(JSON.parse(cachedData));
        }
        let tasks;
        if (req.user.role === 'Admin') {
            tasks = await Task.find(); 
        } else if (req.user.role === 'Manager') {
            tasks = await Task.find({ assignedBy: req.user.id }); 
        } else {
            tasks = await Task.find({
                $or: [
                    { user: req.user.id },        
                    { assignedTo: req.user.id }   
                ]
            });
        }
        redisClient.setEx(cacheKey,3600,JSON.stringify(tasks))
        console.log("data cached")
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.updateTask = async (req, res) => {
    const { title, description, dueDate, priority, status} = req.body;
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ msg: 'Task not found' });

        if (
            task.user.toString() !== req.user.id && 
            task.assignedTo?.toString() !== req.user.id && 
            task.assignedBy?.toString() !== req.user.id && 
            req.user.role !== 'Admin'
        ) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        task.title = title || task.title;
        task.description = description || task.description;
        task.dueDate = dueDate || task.dueDate;
        task.priority = priority || task.priority;
        task.updateBy=req.user.id
        const statusChanged = status && task.status !== status;
        task.status = status || task.status;

        await task.save();
        if (statusChanged && task.assignedTo) {
            const assignedUser = await User.findById(task.assignedTo);
            if (assignedUser && assignedUser.email) {
                sendEmail(
                    assignedUser.email,
                    'Task Status Updated',
                    `The status of the task "${task.title}" has been updated to "${task.status}".`
                );
            }
        }
        redisClient.del(`tasks:${req.user.id}`);
        res.json(task);
    } catch (err) {
        res.status(500).json({ msg: err });
    }
};

exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ msg: 'Task not found' });

        if (
            task.user.toString() !== req.user.id && 
            task.assignedBy?.toString() !== req.user.id && 
            req.user.role !== 'Admin'
        ) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        await Task.findByIdAndDelete(req.params.id); 
        redisClient.del(`tasks:${req.user.id}`);
        res.json({ msg: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.search = async (req, res) => {
    try {
        const { status, priority, dueDate } = req.query;

        let filter = {};
        
        if (status) {
            filter.status = status;
        }
        if (priority) {
            filter.priority = priority;
        }
        if (dueDate) {
            const dueDateObject = new Date(dueDate);
            filter.dueDate = {
                $gte: dueDateObject.setHours(0, 0, 0, 0),
                $lt: new Date(dueDateObject.setDate(dueDateObject.getDate() + 1)).setHours(0, 0, 0, 0)
            };
        }

        let tasks;

       
        if (req.user.role === 'Admin') {
            tasks = await Task.find(filter);
        } else if (req.user.role === 'Manager') {
            tasks = await Task.find({ ...filter, assignedBy: req.user.id }); 
        } else {
            tasks = await Task.find({
                ...filter,
                $or: [
                    { user: req.user.id },        
                    { assignedTo: req.user.id }    
                ]
            });
        }

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getTaskStatistics = async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        let stats;

        if (req.user.role === 'Admin') {
            // Admin: Overall task statistics
            const totalTasks = await Task.countDocuments();
            const completedTasks = await Task.countDocuments({ status: 'Completed' });
            const pendingTasks = await Task.countDocuments({ status: 'Pending' });
            const inProgressTasks = await Task.countDocuments({ status: 'In Progress' });

            stats = {
                totalTasks,
                completedTasks,
                pendingTasks,
                inProgressTasks
            };
        } else if (req.user.role === 'Manager') {
            // Manager: Task statistics Manager
            const tasks = await Task.find({ assignedBy: userId });
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(task => task.status === 'Completed').length;
            const pendingTasks = tasks.filter(task => task.status === 'Pending').length;
            const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;

            stats = {
                totalTasks,
                completedTasks,
                pendingTasks,
                inProgressTasks
            };
        } else if (userRole === 'User') {
            // User: Task statistics for the authenticated user
            const totalTasks = await Task.countDocuments({ assignedTo: userId });
            const completedTasks = await Task.countDocuments({ assignedTo: userId, status: 'Completed' });
            const pendingTasks = await Task.countDocuments({ assignedTo: userId, status: 'Pending' });
            const inProgressTasks = await Task.countDocuments({ assignedTo: userId, status: 'In Progress' });

            stats = {
                totalTasks,
                completedTasks,
                pendingTasks,
                inProgressTasks
            };
        } else {
            return res.status(403).json({ msg: 'Access denied' });
        }

        res.json(stats);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.assignTask = async (req, res) => {
    const { userId } = req.body;
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ msg: 'Task not found' });
        // Only Admin or Manager can assign tasks
        if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        task.assignedTo = userId;
        task.assignedBy = req.user.id; 
        await task.save();
        const user = await User.findById(userId);
       
        if (user && user.email) {
            sendEmail(
                user.email,
                'Task Assigned',
                `A new task titled "${task.title}" has been assigned to you.`
            );
        }
        redisClient.del(`tasks:${req.user.id}`);
        res.json(task);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};


