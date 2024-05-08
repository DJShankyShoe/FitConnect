const express = require('express');
const sql = require('../model/database');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const checkAuth = require('../middleware/checkAuth');
const { main } = require('../process/companyRemoval.js');

const router = express.Router();
dotenv.config();

router.get('/', checkAuth("Admin"), (req, res, next) => {
    res.status(200).json({
        message: 'Handling GET requests to /admin'
    });
});


router.post('/createEnrollmentToken', checkAuth("Admin"), (req, res, next) => {
    const data = {
        companyID: req.body.companyID, 
        priv: 'Enrollment'
    };
    const options = {
        expiresIn: '1d',
        algorithm: 'HS512', 
    };

    if (!req.body.companyID){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });
    };

    sql.validateCompany(req.body.companyID, null, (err, result, msg) => {
        if (err) {
            return res.status(500).json({
                error: msg
            });
        } else if (result) {
            const jwt_token = jwt.sign(data, process.env.JWT_KEY, options); // Generating Token
            return res.status(200).json({
                message: "Auth Passed",
                token: jwt_token
            });

        } else {
            return res.status(401).json({
                message: msg
            });
        }
    });

});


router.post('/createCompany', checkAuth("Admin"), (req, res, next) => {
    const regexDate = /^\d{4}\-(0[1-9]|1[0-2])\-(0[1-9]|[12][0-9]|3[01])*$/;
    const regexPass = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{9,}$/;
    const companyID = req.body.company + req.body.batch

    // Check if required parameters are stated
    if (
        !req.body.company ||
        !req.body.pass ||
        !req.body.tokenExpiry ||
        !req.body.loginExpiry ||
        !req.body.batch 
        ) {
        return res.status(401).json({
            message: "1 or more parameters are missing"
        });
    
    // Check if Expiry dates are valid
    } else if (!regexDate.test(req.body.tokenExpiry) && !regexDate.test(req.body.loginExpiry)){
        return res.status(401).json({
            message: "Invalid Expiry Dates"
        });
    
    // Check if the password requirement is met
    } else if (!regexPass.test(req.body.pass)){
        const passwordRequirements = [
            'Password complexity not met',
            'At least:',
            '- 9 Characters',
            '- 1 Upper Case',
            '- 1 Lower Case',
            '- 1 Numerical Character',
            '- 1 Special Character'
        ];

        return res.status(406).json({
            message: passwordRequirements.join('\n')
        });
    }

    sql.createCompany(companyID, req.body.pass, req.body.tokenExpiry, req.body.loginExpiry, req.body.batch, (err, result, msg) =>{
        if (err){
            return res.status(500).json({
                error: msg
            });
        } else if (result){
            return res.status(201).json({
                message: msg
            });
        } else {
            return res.status(406).json({
                message: msg
            });
        }
    })
});


router.post('/getCompany', checkAuth("Admin"), (req, res, next) => {
    const getCompanyData = `SELECT companyID, tokenExpiry, loginExpiry, batchType FROM company`;

    sql.customSQL(getCompanyData, [], (err, result, msg) => {
        if (err){
            return res.status(500).json({error: msg});
        } else {
            return res.status(200).json({message: msg});
        }
    });
});


router.post('/deleteCompany', checkAuth("Admin"), (req, res, next) => {
    const getCompanyID = `SELECT companyID FROM company`;

    sql.customSQL(getCompanyID, [], async (err, result, msg) => {
        if (err){
            return res.status(500).json({error: msg});
            
        } else {
            if (msg.some(item => item.companyID === req.body.companyID)){

                try {
                    await main(req.body.companyID);
                    return res.status(200).json({message: "Completed"});

                } catch (error) {
                    return res.status(500).json({error: error});
                };
                
            } else {
                return res.status(401).json({message: "Invalid companyID"});
            };
        };
    });
});


router.post('/deleteUser', checkAuth("Admin"), (req, res, next) => {

    const craftedSQL = `DELETE FROM user WHERE userName = ?`;

    if (!req.body.userID){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });
    };

    sql.customSQL(craftedSQL, [req.body.userID], (err, result, msg) => {
        if (err){
            return res.status(500).json({error: msg});

        } else {
            if (!msg["affectedRows"]){
                return res.status(401).json({message: "Invalid User"});
            };

            return res.status(200).json({message: "Deleted User"});
        }
    });
});


router.post('/modifyUser', checkAuth("Admin"), (req, res, next) => {

    const options = ["userName", "userType", "userPass", "pinAttempt", "companyID"];
    const regexPass = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const companyIDSQL = `SELECT companyID FROM company WHERE companyID = ?`;

    if (!req.body.userID || !req.body.type || !req.body.value){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });

    } else if (!Array.isArray(req.body.type)){
        return res.status(401).json({
            message: "Invalid Data Type: type"
        });

    } else if (!Array.isArray(req.body.value)){
        return res.status(401).json({
            message: "Invalid Data Type: value"
        });
    };

    //Check for invalid data
    for (let value of req.body.type) {
        if (!options.includes(value)) {
            return res.status(401).json({
                message: "Invalid Data in type. Only accetps " + options
            });
        };
    };

    if (req.body.type.length !== req.body.value.length){
        return res.status(401).json({
            message: "Number of attributes in values do not match in type"
        });
    };

    // If UserType = 0, set companyID to All
    let userTypeIndex = req.body.type.indexOf('userType');
    let companyIDIndex = req.body.type.indexOf('companyID');

    if (parseInt(req.body.value[userTypeIndex]) === 0) {
        if (companyIDIndex === -1) {
            req.body.type.push('companyID');
            req.body.value.push('All');
            companyIDIndex = req.body.type.length - 1
        } else {
            req.body.value[companyIDIndex] = 'All';
        };

    } else if (userTypeIndex !== -1){
        if (req.body.type.indexOf('companyID') === -1){
            return res.status(401).json({message: "Require to set value for companyID"});
        };
    };

    // Check if password meets policy if changing password
    let passwordIndex = req.body.type.indexOf('userPass');
    if (passwordIndex !== -1) {
        if (!regexPass.test(req.body.value[passwordIndex])){
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
    };

    // Crafting SQL
    let craftedSQL = `UPDATE user SET `;
    for (let i = 0; i < req.body.type.length; i++) {
        craftedSQL += `${req.body.type[i]} = ?`;

        if (i !== req.body.type.length - 1) {
            craftedSQL += ', ';
        };
    };
    craftedSQL += ` WHERE userName = ?`;

    // All data values in array for craftedSQL
    req.body.value.push(req.body.userID);

    // Check if its valid companyID
    if (userTypeIndex !== -1){
        sql.customSQL(companyIDSQL, [req.body.value[companyIDIndex]], (err, result, msg) => {
            if (err){
                return res.status(500).json({error: msg});
    
            } else {
                if (msg.length === 0){
                    return res.status(401).json({message: "Invalid CompanyID"});
                };

                sql.customSQL(craftedSQL, req.body.value, (err, result, msg) => {
                    if (err){
                        return res.status(500).json({error: msg});
            
                    } else {
                        if (!msg["affectedRows"]){
                            return res.status(401).json({message: "Invalid User"});
                        };
                        return res.status(200).json({message: "Value/s Modified"});
                    };
                });
            };
        });

    } else {
        sql.customSQL(craftedSQL, req.body.value, (err, result, msg) => {
            if (err){
                return res.status(500).json({error: msg});
    
            } else {
                if (!msg["affectedRows"]){
                    return res.status(401).json({message: "Invalid User"});
                };
                return res.status(200).json({message: "Value/s Modified"});
            };
        });
    };
});


router.post('/modifyCompany', checkAuth("Admin"), (req, res, next) => {

    const options = ["companyPass", "tokenExpiry", "loginExpiry", "batchType"];
    const regexPass = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!req.body.companyID || !req.body.type || !req.body.value){
        return res.status(401).json({
            message: "Insufficient Parameters"
        });

    } else if (!Array.isArray(req.body.type)){
        return res.status(401).json({
            message: "Invalid Data Type: type"
        });

    } else if (!Array.isArray(req.body.value)){
        return res.status(401).json({
            message: "Invalid Data Type: value"
        });
    };

    //Check for invalid data
    for (let value of req.body.type) {
        if (!options.includes(value)) {
            return res.status(401).json({
                message: "Invalid Data in type. Only accetps " + options
            });
        };
    };

    if (req.body.type.length !== req.body.value.length){
        return res.status(401).json({
            message: "Number of attributes in values do not match in type"
        });
    };

    // Validate date format & value
    function isValidDateValue(dateString) {
        const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;

        if (dateFormatRegex.test(dateString)) {
            const date = new Date(dateString);
            if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateString) {
                return 1;
            };

        } else {
            return 2;
        };
    };

    // Validate date format & value
    let dateIndex1 = req.body.type.indexOf('tokenExpiry');
    if (dateIndex1 !== -1){
        const response = isValidDateValue(req.body.value[dateIndex1]);

        if (response === 1){
            return res.status(401).json({
                message: "Invalid Date Value"
            });
        } else if (response === 2) {
            return res.status(401).json({
                message: "Invalid Date Format"
            });
        };
    };

    let dateIndex2 = req.body.type.indexOf('loginExpiry');
    if (dateIndex2 !== -1){
        const response = isValidDateValue(req.body.value[dateIndex2]);

        if (response === 1){
            return res.status(401).json({
                message: "Invalid Date Value"
            });
        } else if (response === 2) {
            return res.status(401).json({
                message: "Invalid Date Format"
            });
        };
    };

    // Check if password meets policy if changing password
    let passwordIndex = req.body.type.indexOf('companyPass');
    if (passwordIndex !== -1) {
        if (!regexPass.test(req.body.value[passwordIndex])){
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
    };

    // Crafting SQL
    let craftedSQL = `UPDATE company SET `;
    for (let i = 0; i < req.body.type.length; i++) {
        craftedSQL += `${req.body.type[i]} = ?`;

        if (i !== req.body.type.length - 1) {
            craftedSQL += ', ';
        };
    };
    craftedSQL += ` WHERE companyID = ?`;

    // All data values in array for craftedSQL
    req.body.value.push(req.body.companyID);

    sql.customSQL(craftedSQL, req.body.value, (err, result, msg) => {
        if (err){
            return res.status(500).json({error: msg});

        } else {
            if (!msg["affectedRows"]){
                return res.status(401).json({message: "Invalid CompanyID"});
            };
            return res.status(200).json({message: "Value/s Modified"});
        };
    });
});


// - Create User *Done*
// - Delete User *Done*
// - Modify User Details *Done*

// - Create Company *Done*
// - Delete Company *Done*
// - Modify Company Details *Done*
// - View Company Details *Done*

// - Create Recruit Link *Done*
// - View Recruits *Done*


module.exports = router;