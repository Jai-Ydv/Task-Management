const { createClient } = require('redis');

const redisClient = createClient({
    password: 'WZGDtKsX2tBElI2yT9K6kGO8HRnN1SAN',
    socket: {
        host: 'redis-13313.c257.us-east-1-3.ec2.redns.redis-cloud.com',
        port: 13313
    }
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

(async () => {
    try {
        await redisClient.connect(); 
        console.log('Connected to Redis');
    } catch (err) {
        console.error('Redis connection error:', err);
    }
})();

module.exports = redisClient;
