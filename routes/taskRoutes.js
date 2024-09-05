const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { 
    createTask, 
    getTasks, 
    updateTask, 
    deleteTask, 
    assignTask,
    search,
    getTaskStatistics
} = require('../controllers/taskController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles  = require('../middlewares/roleMiddleware');
const { validateTaskCreation, validateTaskUpdate,validateId } = require('../validators/taskValidator');
// General rate limiter for all endpoints
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Route to create a task (Authenticated users can create a task)
router.post('/create',generalLimiter, authMiddleware,validateTaskCreation, createTask);

// Route to get tasks (Authenticated users can view their tasks)
router.get('/get',generalLimiter, authMiddleware, getTasks);

// Route to update a task (Only authorized users can update the task)
router.put('/update/:id',generalLimiter, authMiddleware,validateId,validateTaskUpdate, updateTask);

// Route to delete a task (Only authorized users can delete the task)
router.delete('/delete/:id',generalLimiter, authMiddleware,validateId,deleteTask);

// Route to get filter tasks (Authenticated users can view their tasks)
router.get('/search', generalLimiter, authMiddleware, search);

// Single route for task statistics based on user role
router.get('/statistics',generalLimiter, authMiddleware, getTaskStatistics);

// Route to assign a task (Managers or Admins can assign tasks)
router.put('/assign/:id',generalLimiter, authMiddleware,validateId, authorizeRoles(['Manager', 'Admin']), assignTask);

module.exports = router;
