const express = require('express');
const sql = require('../model/database');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const checkAuth = require('../middleware/checkAuth');

const router = express.Router();
dotenv.config();

router.get('/', (req, res, next) => {
    res.status(200).json({
        message: 'Handling GET requests to /user'
    });
});

router.post('/create', checkAuth(['Create User', 'Admin']), (req, res, next) => {
    // Decoding Token without verification to extract companyID
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.decode(token, {complete: false});
    let companyID = decoded["companyID"];
    const regexPass = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    let priv = "User";
    let bypassExpriy = false;

    if (companyID === 'All'){
        companyID = req.body.companyID;
        priv = req.body.priv;
        bypassExpriy = true;
    };

    if (priv === "Admin"){
        companyID = "All";
    }

    if (!req.body.userID || !req.body.pass || !companyID || !priv){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });
    };

    if (priv !== "Admin" && priv !== "Trainer" && priv !== "User"){
        return res.status(401).json({
            message: "Invalid Priv type. Only accepts Admin, Trainer, User"
        });
    }

    const data = {
        userID: req.body.userID,
        companyID: companyID,
        priv: priv
    };
    const options = {
        expiresIn: '5d',
        algorithm: 'HS512', 
    };

    if (!regexPass.test(req.body.pass)){
        const passwordRequirements = [
            'Password complexity not met',
            'At least:',
            '- 8 Characters',
            '- 1 Upper Case',
            '- 1 Lower Case',
            '- 1 Numerical Character',
            '- 1 Special Character'
        ];

        return res.status(406).json({
            message: passwordRequirements.join('\n')
        });
    };

    sql.createUser(req.body.userID, req.body.pass, companyID, priv, bypassExpriy, (err, result, msg) => {
        if (err){
            return res.status(500).json({error: "Internal Server Error"});

        } else if (result){

            if (companyID === "All"){
                return res.status(201).json({message: msg});

            } else {
                const jwt_token = jwt.sign(data, process.env.JWT_KEY, options); // Generating Token
                return res.status(201).json({
                    message: msg,
                    token: jwt_token
                });
            };
            
        } else {
            return res.status(406).json({
                message: msg
            });
        };
    })
});

router.post('/login', (req, res, next) => {

    if (!req.body.pass || !req.body.userID){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });
    };

    const options = {
        expiresIn: '5d',
        algorithm: 'HS512', 
    };

    sql.loginUser(req.body.userID, req.body.pass, (err, result, msg) =>{
        if (err){
            return res.status(500).json({
                error: "Internal Server Error"
            });
        } else if (result){
            let data;
            if (result[0]['userType'] === 0){
                data = {
                    userID: req.body.userID,
                    companyID: 'All',
                    priv: 'Admin'
                };
            } else if (result[0]['userType'] === 2){
                data = {
                    userID: req.body.userID,
                    companyID: 'All',
                    priv: 'Trainer'
                };
            } else {
                data = {
                    userID: req.body.userID,
                    companyID: result[0]['companyID'],
                    priv: 'User'
                };
            }

            const jwt_token = jwt.sign(data, process.env.JWT_KEY, options); // Generating Token
            return res.status(201).json({
                message: "Auth Passed",
                token: jwt_token
            });
        } else if (result === 0){
            return res.status(401).json({
                message: msg
            });
        } else {
            return res.status(401).json({
                message: "Invalid Username or Password"
            });
        }
    });
});

router.post('/type', checkAuth(), (req, res, next) => {
    // Decoding Token without verification to extract companyID
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.decode(token, {complete: false});
    const type = decoded['priv']

    const valid = ['Create User', 'User', 'Admin', 'Trainer', 'Enrollment'];

    if (valid.includes(type)){
        return res.status(201).json({
            message: `Valid: ${type}`,
        });
    }  else {
        return res.status(401).json({
            message: "Invalid"
        });
    }
})


module.exports = router;