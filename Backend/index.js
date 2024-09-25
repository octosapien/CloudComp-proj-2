const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const appointmentRouter = require('./Routes/appointments');
const patientsRouter = require('./Routes/patients');
const doctorsRouter = require('./Routes/doctors');
const NodeCache = require('node-cache');
const app = express();
const port = process.env.PORT || 5000;
const dotenv = require('dotenv');

dotenv.config();

app.use(cors());
app.use(bodyParser.json());

// Initialize cache (TTL: 5 minutes, Check period: 6 minutes)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 360 });

// Caching middleware for GET requests only
function cacheMiddleware(req, res, next) {
    if (req.method !== 'GET') {
        return next(); // Skip caching if not a GET request
    }

    const key = req.originalUrl;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
        console.log(`Cache HIT for key: ${key}`); // Log cache hit
        return res.json(cachedResponse);
    } else {
        console.log(`Cache MISS for key: ${key}`); // Log cache miss
        res.sendResponse = res.json;
        res.json = (body) => {
            cache.set(key, body);
            console.log(`Caching response for key: ${key}`); // Log response being cached
            res.sendResponse(body);
        };
        next();
    }
}

// Database connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Database connected successfully...');
}).catch(error => {
    console.error(error);
});

// Apply caching middleware to the routes that need caching
app.use('/appointments', cacheMiddleware, appointmentRouter);
app.use('/patients', cacheMiddleware, patientsRouter);
app.use('/doctors', cacheMiddleware, doctorsRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
});
