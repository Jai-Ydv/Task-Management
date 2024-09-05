const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Task = require('../models/taskModel');
const redisClient = require('../config/redisClient');

exports.register = async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        const user = await User.findOne(  {$or: [
            { email },
            { username }
        ]});
        if (user) return res.status(400).json({ msg: 'User already exists' });
        let newpassword=await bcrypt.hashSync(password, 10)
        
        console.log("running",newpassword)
        const newUser = new User({ username, email, password:newpassword, role });
        await newUser.save();
        console.log("running",newUser)
        const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ token });
    } catch (err) {
        res.status(500).json({ msg: err });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.getProfile = async (req, res) => {
    const userId = req.user.id;
    const cacheKey = `userProfile:${userId}`;

    try {
      
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log("Data retrieved from cache");
            return res.json(JSON.parse(cachedData));
        }

      
        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Cache the result for 1 hour
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(user));

        console.log("Data cached");
        return res.json(user);

    } catch (err) {
        console.error("Redis or DB Error:", err);
        return res.status(500).json({ msg: 'Server error' });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const cacheKey = `userProfile:${req.user.id}:${req.user.role}`;
        
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log("from cached")
            return res.json(JSON.parse(cachedData)); 
        }

        let users;

        // Admin: Get all users
        if (req.user.role === 'Admin') {
            users = await User.find().select('-password');
            if (users.length === 0) {
                return res.json({ message: 'No user found' });
            }

            // Cache result for 1 hour
            await redisClient.setEx(cacheKey, 3600, JSON.stringify(users));
            return res.json(users);
        }

        // Manager: Get all users assigned by this manager
        if (req.user.role === 'Manager') {
            const tasks = await Task.find({ assignedBy: req.user.id }).distinct('assignedTo');
            if (tasks.length === 0) {
                return res.json({ message: 'No tasks assigned by you' });
            }

            users = await User.find({ _id: { $in: tasks } }).select('-password');
            if (users.length === 0) {
                return res.json({ message: 'No user found' });
            }

            // Cache result for 1 hour
            await redisClient.setEx(cacheKey, 3600, JSON.stringify(users));
            return res.json(users);
        }

        // User: Get the profile of the authenticated user
        if (req.user.role === 'User') {
            const user = await User.findById(req.user.id).select('-password');
            if (!user) {
                return res.json({ message: 'No user found' });
            }

            // Cache result for 1 hour
            await redisClient.setEx(cacheKey, 3600, JSON.stringify(user));
            return res.json(user);
        }

        // If role does not match
        return res.status(403).json({ msg: 'Access denied' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

