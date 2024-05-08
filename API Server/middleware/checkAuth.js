const jwt = require('jsonwebtoken');
const sql = require('../model/database');

// Creating a Sleep function
function wait(milliseconds){
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
};

async function customSQLAsync(exQuery, values=[]) {
    return new Promise((resolve, reject) => {
        sql.customSQL(exQuery, values, (err, result, msg) => {
            if (err) {
                return reject(err);
            }
            resolve(msg);
        });
    });
};


module.exports = (type = null) => async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_KEY);

        // Check for correct priviledges
        if (type === null) {
            req.userData = decoded;
        } else if (type === decoded['priv'] || (Array.isArray(type) && type.includes(decoded['priv']))) {
            req.userData = decoded;
        } else {
            // To get error
            throw new Error({"name":"Invalid token"});
        };

        // Check for expired company
        if (decoded['priv'] === 'Admin' || decoded['priv'] === 'Trainer' || decoded['priv'] === 'User'){
            const query = `SELECT companyID FROM company`;
            const msg = await customSQLAsync(query);

            if (!msg.some(item => item.companyID === decoded['companyID'])){
                throw new Error({"name":"Invalid token"});
            };
        };

        next();

    } catch (error) {
        const type = error["name"];
        var msg = "Auth failed";
        await wait(2000);
        
        if (type === "TokenExpiredError"){
            msg = "Timeout Error";
            await wait(1000);
        }

        return res.status(401).json({message: msg});
    };
};