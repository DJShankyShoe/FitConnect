const express = require('express');
const sql = require('../model/database');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const base64url = require('base64url');
const checkAuth = require('../middleware/checkAuth');
const axios = require('axios');

const router = express.Router();
dotenv.config();

router.get('/', (req, res, next) => {
    res.status(200).json({
        message: 'Handling GET requests to /participant'
    });
});

router.post('/getAuthorizationLink', checkAuth("Enrollment"), (req, res, next) => {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.decode(token, {complete: false});
    const companyID = decoded['companyID'];

    if (!req.body.participantName || !req.body.participantID){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });
    };

    const participantID = req.body.participantID;
    const data = {
        companyID: companyID,
        participantName: req.body.participantName,
        participantID: participantID,
        priv: 'Create Participant'
    };
    // Token expiration time: 20 minutes (1200 seconds)
    const options = {
        expiresIn: '20m',
        algorithm: 'HS512', 
    };

    // Check if 4D is valid
    const regex = /^[1-4][1-4](0[1-9]||1[0-6])$/;;

    if (!regex.test(participantID)) {
        return res.status(400).json({
            message: "4D not valid"
        });
    };

    sql.checkParticpant(companyID, participantID, (err, result, msg) => {
        if (err){
            return res.status(500).json({
                error: msg
            });
            
        } else {
            if (msg === "Participant 4D exist"){
                return res.status(409).json({
                    message: msg
                });
            } else if (msg === "Participant 4D does not exist") {
                // Generating Token
                const jwt_token = jwt.sign(data, process.env.JWT_KEY, options); 
                // Convert PKCE to hex
                const PKCE = process.env.PKCE.toString('hex');
                // SHA 256 PKE
                const sha256Hash = crypto.createHash('sha256').update(PKCE).digest();
                // Base 64 converter
                const codeChallenge = base64url(sha256Hash);
                // scope
                const scope = "activity+cardio_fitness+heartrate+oxygen_saturation+respiratory_rate+sleep"
                // link
                const link = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${process.env.CLIENT_ID}&scope=${scope}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${jwt_token}`

                return res.status(200).json({
                    message: msg,
                    link: link
                });
            } else {
                return res.status(500).json({
                    message: msg
                });
            }
        }
    });
});

router.post('/createParticipant', checkAuth("Create Participant"), (req, res, next) => {
    // Decoding Token without verification to extract companyID
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.decode(token, {complete: false});
    const companyID = decoded['companyID'];
    const participantName = decoded['participantName'];
    const participantID = decoded['participantID'];

    const auth = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');

    if (!req.body.code){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });
    };

    const postData = {
        client_id: process.env.CLIENT_ID,
        grant_type: 'authorization_code',
        code: req.body.code,
        code_verifier: process.env.PKCE,
    };
    
    const headers = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    axios.post('https://api.fitbit.com/oauth2/token', new URLSearchParams(postData), { headers }).then(response => {
        const required_scope = ["activity", "respiratory_rate", "cardio_fitness", "oxygen_saturation", "heartrate", "sleep"];
        const response_scope = response.data.scope.split(' ');
        const respUserID = response.data.user_id;
        const respAccessToken = response.data.access_token;
        const respRefreshToken = response.data.refresh_token;
        const allScopesPresent = required_scope.every(scope => response_scope.includes(scope));

        // Check if 4D is valid
        const regex = /^[1-4][1-4](0[1-9]||1[0-6])$/;;

        if (!regex.test(participantID)) {
            return res.status(400).json({
                message: "4D not valid"
            });

        } else {
            sql.checkParticpant(req.body.companyID, req.body.participantID, (err, result, msg) => {
                if (err){
                    return res.status(500).json({
                        error: msg
                    });
                    
                } else {
                    if (msg === "Participant 4D exist"){
                        return res.status(409).json({
                            message: msg
                        });
                    };
                };
            });
    
            if (allScopesPresent) {
                sql.createParticpant(respUserID, participantName, participantID, respAccessToken, respRefreshToken, companyID, (err, result, msg) => {
                    if (err){

                        if (err.sqlMessage.includes("Duplicate entry")){
                            return res.status(400).json({message: "Participant already exists"});
                        } else {
                            return res.status(400).json({error: err.message});
                        };

                    } else {
                        return res.status(200).json({
                            message: "Validated",
                            participantID: participantID
                        });
                    };
                });

            } else {
                return res.status(406).json({message: "Select all scopes and try again"});
            };
        };

    }).catch(error => {
        return res.status(400).json({error: error.message});
    });
});

router.post('/status', checkAuth(["User", "Trainer", "Admin"]), (req, res, next) => {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.decode(token, {complete: false});
    let companyID = decoded['companyID'];

    if (companyID === 'All'){
        companyID = req.body.companyID;
    };

    if (!companyID){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });
    };
    
    sql.participantStatus(companyID, (err, result, msg) => {
        if (err){
            return res.status(500).json({
                error: msg
            });
        } else {
            const list4D = msg.map(entry => parseInt(entry['4DNumber'], 10));;
            return res.status(200).json({
                message: list4D
            });
        }
    });
});

router.post('/getInfo', checkAuth(["User", "Trainer", "Admin"]), (req, res, next) => {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.decode(token, {complete: false});
    let companyID = decoded['companyID'];
    const query = `SELECT name FROM recruits where 4DNumber = ? AND companyID = ?`;

    if (companyID === 'All'){
        companyID = req.body.companyID;
    };

    if (!req.body.recruit4D || !companyID){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });
    };
    
    sql.customSQL(query, [req.body.recruit4D, companyID], (err, result, msg) => {
        if (err){
            return res.status(500).json({
                error: msg
            });
        } else {
            return res.status(200).json({
                message: msg[0]
            });
        }
    });
});

router.post('/removeParticipant', checkAuth(["User", "Trainer", "Admin"]), (req, res, next) => {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.decode(token, {complete: false});
    const companyID = decoded['companyID'];
    const query = `DELETE FROM recruits WHERE 4DNumber = ? AND companyID = ?`;

    if (companyID === 'All'){
        companyID = req.body.companyID;
    };

    if (!req.body.recruit4D || !companyID){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });
    };
    
    sql.customSQL(query, [req.body.recruit4D, companyID], (err, result, msg) => {
        if (err){
            return res.status(500).json({
                error: msg
            });
        } else {
            return res.status(200).json({
                message: "Success"
            });
        }
    });
});


module.exports = router;