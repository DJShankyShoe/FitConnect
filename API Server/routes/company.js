const express = require('express');
const sql = require('../model/database.js');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const router = express.Router();
dotenv.config();

router.get('/', (req, res, next) => {
    res.status(200).json({
        message: 'Handling GET requests to /company'
    });
});

router.post('/login', (req, res, next) => {
    const data = {
        companyID: req.body.companyID, 
        priv: 'Create User'
    };
    const options = {
        expiresIn: '5m',
        algorithm: 'HS512', 
    };

    if (!req.body.pass || !req.body.companyID){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });
    };

    // new Promise(resolve => setTimeout(resolve, 5000));
    sql.checkCompany(req.body.companyID, req.body.pass, (err, result, msg) => {
        if (err){
            return res.status(500).json({
                error: msg
            });
        } else if (result){
            const jwt_token = jwt.sign(data, process.env.JWT_KEY, options); // Generating Token
            return res.status(200).json({
                message: "Auth Passed",
                token: jwt_token
            });
        } else if (result === 0){
            return res.status(401).json({
                message: msg
            });
        } else {
            return res.status(401).json({
                message: "Invalid Company ID or Password"
            });
        }
    });
});


module.exports = router;