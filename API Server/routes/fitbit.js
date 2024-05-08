const express = require('express');
const sql = require('../model/database');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const checkAuth = require('../middleware/checkAuth');
const { customExec } = require('../process/dataRetrieval.js');

const router = express.Router();
dotenv.config();

router.get('/', (req, res, next) => {
    res.status(200).json({
        message: 'Handling GET requests to /fitbit'
    });
});

router.post('/all', checkAuth(["User", "Trainer", "Admin"]), (req, res, next) => {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.decode(token, {complete: false});
    let companyID = decoded['companyID'];
    const regexDate = /^\d{4}\-(0[1-9]|1[0-2])\-(0[1-9]|[12][0-9]|3[01])*$/;

    if (companyID === 'All'){
        companyID = req.body.companyID;
    };

    if (!req.body.recruit4D || !req.body.date || !companyID){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });

    } else if (!regexDate.test(req.body.date)){
        return res.status(401).json({
            message: "Invalid Date"
        });
    };

    sql.getAllData(companyID, req.body.recruit4D, req.body.date, (err, result, msg) => {
        if (err){
            return res.status(500).json({error: msg});

        } else {
            // Check for valid company
            if (result){
                return res.status(401).json({message: msg});

            } else if (msg.length > 0){
                return res.status(201).json({message: msg});

            } else {
                // If data doesnt exists, extract one
                customExec([req.body.recruit4D], companyID, req.body.date).then(() => {

                    // Execute SQL again once data is created
                    sql.getAllData(companyID, req.body.recruit4D, req.body.date, (err, result, msg) => {
                        if (err){
                            return res.status(500).json({error: msg});
                        } else {
                            return res.status(201).json({message: msg});
                        }
                    });

                }).catch(err => {
                    return res.status(500).json({error: err});
                });
            };
        };
    });
});


router.post('/data', checkAuth(["User", "Trainer", "Admin"]), (req, res, next) => {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.decode(token, {complete: false});
    const regexDate = /^\d{4}\-(0[1-9]|1[0-2])\-(0[1-9]|[12][0-9]|3[01])*$/;
    let companyID = decoded['companyID'];

    if (companyID === 'All'){
        companyID = req.body.companyID;
    };

    if (!req.body.date || !req.body.type || !companyID){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });

    } else if (!regexDate.test(req.body.date)){
        return res.status(401).json({
            message: "Invalid Date"
        });
    };

    sql.getPartData(companyID, req.body.date, req.body.type, (err, result, recruitData) => {
        if (err){
            return res.status(500).json({error: recruitData});

        } else {
            if (result){
                return res.status(401).json({message: recruitData});
            };

            sql.participantStatus(companyID, (err, result, msg) => {
                if (err){
                    return res.status(500).json({error: msg});
                };

                // Find data from total recruits
                const missing4DNumbers = [];
                msg.forEach(msgItem => {
                    const found = recruitData.some(recruitItem => recruitItem["4DNumber"] === msgItem["4DNumber"]);
                    if (!found) {
                        missing4DNumbers.push(msgItem["4DNumber"]);
                    }
                });

                if (missing4DNumbers.length > 0){
                    // If data doesnt exists, extract one
                    customExec(missing4DNumbers, companyID, req.body.date).then(() => {
                        // Execute SQL again once data is created
                        sql.getPartData(companyID, req.body.date, req.body.type, (err, result, msg) => {
                            if (err){
                                return res.status(500).json({error: msg});
                            } else {
                                return res.status(201).json({message: msg});
                            }
                        });
                    }).catch(err => {
                        return res.status(500).json({error: err});
                    });
                    
                } else {
                    return res.status(201).json({message: recruitData});
                };
            });
        };
    });
});


module.exports = router;