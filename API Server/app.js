const express = require('express');
const app = express();
const bodyParser = require('body-parser');

// For Scheduling
const cron = require('node-cron');
const { spawn } = require('child_process');

// For Morgan - logging files
const morgan = require('morgan');
const fs = require('fs')

const companyRoutes = require('./routes/company');
const userRoutes = require('./routes/user');
const participantRoutes = require('./routes/participant');
const fitbitRoutes = require('./routes/fitbit');
const adminRoutes = require('./routes/admin');
const { error } = require('console');

// Allow Json Body Parsing
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Execute Logging in files & terminal
morgan.token('body', (req, res) => JSON.stringify(req.body));
morgan.token('log', ':remote-addr :remote-user [:date[clf]] ":method :url" :status :req[content-length] --> :body');
app.use(morgan('log', {stream: fs.createWriteStream('./access.log', {flags: 'a'})}));
app.use(morgan('dev')); //only for dev

// CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // Change Astrix to your web domain after dev phase
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === 'OPTIONS') {
        res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        return res.status(200).json({});
    }
    next();
});

// Routes to handle requests
app.use('/company', companyRoutes);
app.use('/user', userRoutes);
app.use('/participant', participantRoutes);
app.use('/fitbit', fitbitRoutes);
app.use('/admin', adminRoutes);

// Error Handling
app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
})
app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {message: error.message}
    })
})


// Function to run a Node.js script using spawn and log output
function runScript(scriptName, callback) {
    console.log(`[*] Running ${scriptName}...`);
    const process = spawn('node', [`process/${scriptName}`]);
    process.stdout.on('data', (data) => { console.log(`${data}`); });
    process.stderr.on('data', (data) => { console.error(`${data}`); });
    process.on('close', (code) => {
        console.log(`[+] ${scriptName} process exited with code ${code}`);
        callback(); // Call the callback function when the script completes
    });
};

// Execute companyRemoval.js once before Cronjob
runScript('companyRemoval.js', () => {
    console.log("[+] companyRemoval.js completed");

    // Execute resetRefreshToken once after companyRemoval.js is completed
    runScript('resetRefreshToken.js', () => {
        console.log("[+] resetRefreshToken.js completed");

        // Execute dataRetrieval once after resetRefreshToken.js is completed
        runScript('dataRetrieval.js', () => {
            console.log("[+] dataRetrieval.js completed");
        });
    });
});

// Schedule the execution of companyRemoval.js every 15 days
cron.schedule('0 0 */15 * *', () => {
    console.log('[*] Running companyRemoval.js...');
    const process4 = spawn('node', ['process/companyRemoval.js']);
    process4.stdout.on('data', (data) => {console.log(`${data}`);});
    process4.stderr.on('data', (data) => {console.error(`${data}`);});
    process4.on('close', (code) => {console.log(`[+] companyRemoval.js process exited with code ${code}`);});
});

// Schedule the execution of resetRefreshToken.js every 3.5 hours
cron.schedule('0 */3.5 * * *', () => {
    console.log('[*] Running resetRefreshToken.js...');
    const process2 = spawn('node', ['process/resetRefreshToken.js']);
    process2.stdout.on('data', (data) => {console.log(`${data}`);});
    process2.stderr.on('data', (data) => {console.error(`${data}`);});
    process2.on('close', (code) => {console.log(`[+] resetRefreshToken.js process exited with code ${code}`);});
});

// Schedule the execution of dataRetrieval.js every 20 min
cron.schedule('*/20 * * * *', () => {
    console.log('[*] Running dataRetrieval.js...');
    const process4 = spawn('node', ['process/dataRetrieval.js']);
    process4.stdout.on('data', (data) => {console.log(`${data}`);});
    process4.stderr.on('data', (data) => {console.error(`${data}`);});
    process4.on('close', (code) => {console.log(`[+] dataRetrieval.js process exited with code ${code}`);});
});


module.exports = app;