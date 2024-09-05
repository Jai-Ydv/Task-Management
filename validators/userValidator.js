const Joi = require('joi');

// User registration validation schema
const registerValidationSchema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email({ tlds: { allow: false } }).pattern(/@gmail\.com$/).required(),
    password: Joi.string()
        .min(8) 
        .max(50) 
        .required()
        .pattern(/[A-Z]/) 
        .pattern(/[a-z]/) 
        .pattern(/[0-9]/) 
        .pattern(/[@$!%*?&]/) 
        .messages({
            'string.pattern.base': 'Password must include at least one uppercase letter, one lowercase letter, one digit, and one special character.',
        }),
    role: Joi.string().valid('User', 'Manager', 'Admin').required()
});

// User login validation schema
const loginValidationSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
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

module.exports = {
    validateRegister: validate(registerValidationSchema),
    validateLogin: validate(loginValidationSchema)
};
