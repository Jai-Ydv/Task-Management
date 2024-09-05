const Joi = require('joi');

// Task creation validation schema
const taskCreationSchema = Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().min(5).required(),
    dueDate: Joi.date().required(),
    priority: Joi.string().valid('Low', 'Medium', 'High').required(),
    userId: Joi.string().optional(),
});

// Task update validation schema
const taskUpdateSchema = Joi.object({
    title: Joi.string().min(3).max(100).optional(),
    description: Joi.string().min(5).optional(),
    dueDate: Joi.date().optional(),
    priority: Joi.string().valid('Low', 'Medium', 'High').optional(),
    status: Joi.string().valid('Pending', 'In Progress', 'Completed').optional(),
});

// Middleware function to handle validation
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ msg: error.details[0].message });
        } else {
            next();
        }
    };
};

const validateId = (req, res, next) => {
    const id = req.params.id;
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        return res.status(400).json({ msg: 'Invalid ID format' });
    }
    next();
};

module.exports = {
    validateTaskCreation: validate(taskCreationSchema),
    validateTaskUpdate: validate(taskUpdateSchema),
    validateId,
};
