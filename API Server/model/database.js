const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

var pool  = mysql.createPool({
  host     : process.env.MYSQL_HOST,
  user     : process.env.MYSQL_USER,
  password : process.env.MYSQL_PASS,
  database : process.env.MYSQL_DATABASE,
  connectTimeout: 30000,
  connectionLimit : 30
});

// Creating a Sleep function
function wait(milliseconds){
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}


async function callQuery(query, sleep = 0, callback) {
    await wait(sleep);
    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, null);
        } else {
            connection.query(query, (err, result) => {
                connection.release();
                callback(err, result, "Query Executed Successfully");
            });
        }
    });
};


async function validateCompany(companyID, password, callback) {
    const craftedSQL = `SELECT * FROM company WHERE companyID = ?`;
    await wait(1500);

    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, "Internal Server Error - 1506");

        } else {
            connection.query(craftedSQL, [companyID], (err, result) => {
                connection.release();

                if (err) {
                    return callback(err, null, "Internal Server Error - 1784");
                
                // Checks if user exists    
                } else if (result.length === 1) {
                    const hash = result[0]["companyPass"];

                    // Verify if Company Login & Token Expiry is within window
                    const tokenExpiry = new Date(result[0]["tokenExpiry"]);
                    const currentDate = new Date();

                    // Check for password match
                    if (password) {
                        bcrypt.compare(password, hash, function(err, result) {
                            if (!result){
                                return callback(err, null, "Incorrect Password");
                            };
                        });
                    };

                    if (tokenExpiry > currentDate) {
                        return callback(err, result, "Valid");
                    } else {
                        return callback(err, null, "CompanyID Expired")
                    };

                } else {
                    return callback(err, null, "Invalid CompanyID");
                };
            });
        }
    });
};


function createUser(userID, password, companyID, priv, bypassExpiry, callback) {
    const checkUserSQL = `SELECT * FROM user INNER JOIN company USING (companyID) WHERE LOWER(userName) = LOWER(?)`;
    const getInfoSQL = `SELECT * FROM company WHERE companyID = ?`;
    const createUserSQL = `INSERT INTO user VALUES (?, ?, ?, '8', NULL, ?);`; // userName, userType, userPass, pinAttempt, adminPass, companyID

    let userType;
    if (priv === "Admin"){
        userType = 0;
        
    } else if (priv === "Trainer"){
        userType = 2;

    } else if (priv === "User"){
        userType = 1;
    };

    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, "Internal Server Error - 1507");
        };

        // Check if it's a unique username
        connection.query(checkUserSQL, [userID], (err, existingUser) => {
            if (err) {
                connection.release();
                return callback(err, null, "Error 492 occurred");
            };

            if (existingUser.length > 0) {
                connection.release();
                return callback(err, null, "User already exists");
            };

            // Get company info
            connection.query(getInfoSQL, [companyID], (err, companyInfo) => {
                if (err) {
                    connection.release();
                    return callback(err, null, "Internal Server Error - 1598");
                };

                if (companyInfo.length === 0) {
                    connection.release();
                    return callback(err, null, "Invalid companyID");
                };

                const loginExpiry = new Date(companyInfo[0]["loginExpiry"]);
                const tokenExpiry = new Date(companyInfo[0]["tokenExpiry"]);
                const currentDate = new Date();

                let check = (loginExpiry < currentDate || tokenExpiry < currentDate);
                if (bypassExpiry){
                    check = (tokenExpiry < currentDate);
                };

                if (check) {
                    connection.release();
                    return callback(err, null, "Expired Company");
                };

                // Hash password
                bcrypt.hash(password, 13, (err, hashedPassword) => {
                    if (err) {
                        connection.release();
                        return callback(err, null, "User creation failed. Error 765 occurred");
                    };

                    // Insert user
                    connection.query(createUserSQL, [userID, userType, hashedPassword, companyID], (err, insertResult) => {
                        connection.release();
                        if (err) {
                            return callback(err, null, "User creation failed. Error 766 occurred");
                        };

                        return callback(err, insertResult, "User created");
                    });
                });
            });
        });
    });
};


async function createCompany(companyID, companyPass, tokenExpiry, loginExpiry, batchType, callback) {
    const checkCompanySQL = `SELECT * FROM company WHERE companyID = ?`;
    const createCompanySQL = `INSERT INTO company VALUES (?, ?, ?, ?, ?);`; // companyID, companyPass, tokenExpiry, loginExpiry, batchType

    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, "Internal Server Error - 1507");
        } else {

            // Checks if its a unique username  
            connection.query(checkCompanySQL, [companyID], (err, result) => {
                
                if (err) {
                    connection.release();
                    return callback(err, null, "Error 8637 occured");
                
                // Create Account   
                } else if (result.length < 1) {

                    // Create bcrypt password
                    bcrypt.hash(companyPass, 13, (err, hash) => { // Hash Password
                        if (err){
                            connection.release();
                            return callback(err, null, "Company creation failed. Error 9736 occured");

                        } else {
                            connection.query(createCompanySQL, [companyID, hash, tokenExpiry, loginExpiry, batchType], (err, result) => { // Inserting User into database
                                connection.release();
                                if (err) {
                                    return callback(err, null, "Company creation failed. Error 9737 occured");
                                } else {
                                    return callback(err, result, "Company created");
                                }
                            });
                        };
                    });

                } else {
                    connection.release();
                    return callback(err, null, "Company batch of " + batchType + " already exists");
                }
            });
        }
    });
};


async function checkCompany(companyID, password, callback) {
    const craftedSQL = `SELECT * FROM company WHERE companyID = ?`;
    await wait(1500);

    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, null);
        } else {
            connection.query(craftedSQL, [companyID], (err, result) => {
                connection.release();

                if (err) {
                    return callback(err, null, null);
                
                // Checks if user exists    
                } else if (result.length === 1) {
                    const hash = result[0]["companyPass"];

                    // Verify if Company Login & Token Expiry is within window
                    const loginExpiry = new Date(result[0]["loginExpiry"]);
                    const tokenExpiry = new Date(result[0]["tokenExpiry"]);
                    const currentDate = new Date();
                    

                    if (loginExpiry > currentDate && tokenExpiry > currentDate) {

                        // Check for password match
                        bcrypt.compare(password, hash, function(err, result) {
                            if (result){
                                return callback(err, result, "Correct Password");
                            } else {
                                return callback(err, null, "Incorrect Password");
                            };
                        });
                    } else {
                        return callback(err, 0, "User Expired")
                    }
                } else {
                    callback(err, null, "Invalid User");
                }
            });
        }
    });
};


async function loginUser(userID, password, callback) {
    const craftedSQL = `SELECT * FROM user INNER JOIN company USING (companyID) WHERE userName = ?`;
    const resetPinCount = `UPDATE user SET pinAttempt = 8 where userName = ?`;
    const setPinCount = `UPDATE user SET pinAttempt = ? where userName = ?`;
    await wait(1500);

    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, null);
        } else {
            connection.query(craftedSQL, [userID], (err, result) => { // Retrieve User Hash & CompanyID from database

                if (err){
                    connection.release();
                    return callback(err, null, "Error 989 occured");
                
                }  else if (result.length === 1){

                    // Verify account status
                    if (result[0]['pinAttempt'] < 1){
                        connection.release();
                        return callback(err, 0, "Account Locked! Contact Support.");
                    }

                    // Verify if Company Login & Token Expiry is within window
                    const tokenExpiry = new Date(result[0]["tokenExpiry"]);
                    const currentDate = new Date();

                    // Verify bcrypt password
                    bcrypt.compare(password, result[0]['userPass'], function(err, check) {
                        if (check) {
                            if (tokenExpiry > currentDate) {
                                connection.query(resetPinCount, [userID], (err, result) => { // Reset Pin Count to 8
                                    if (err){
                                        connection.release();
                                        return callback(err, null, "Error 988 occured"); 
                                    };
                                });
                                connection.release();
                                return callback(err, result, "Correct Password");

                            } else {
                                connection.release();
                                return callback(err, 0, "Expired User");
                            };

                        } else {
                            connection.query(setPinCount, [result[0]['pinAttempt'] - 1, userID], (err, result) => { // Retrieve User Hash & CompanyID from database
                                if (err){ 
                                    connection.release();
                                    return callback(err, null, "Error 987 occured"); 
                                };
                                connection.release();
                                return callback(err, null, "Invalid Password");
                            });
                        };
                    });

                } else {
                    connection.release();
                    return callback(err, null, "Invalid Username");
                };
            });
        };
    });
};


async function checkParticpant(companyID, participantID, callback) {
    const craftedSQL = `SELECT 4DNumber FROM recruits WHERE companyID = ? AND 4DNumber = ?`;
    await wait(1500);

    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, "Internal Server Error - 1955");
        } else {
            connection.query(craftedSQL, [companyID, participantID], (err, result) => {
                connection.release();

                if (err) {
                    return callback(err, null, "Internal Server Error - 1743");

                // Checks if user exists    
                } else if (result.length > 0) {
                    return callback(err, null, "Participant 4D exist");
                    
                } else {
                    return callback(err, null, "Participant 4D does not exist");
                }
            });
        }
    });
};


async function createParticpant(respUserID, respUserName, participantID, respAccessToken, respRefreshToken, companyID, callback) {
    const craftedSQL = `INSERT INTO recruits VALUES (?, ?, ?, ?, ?, ?)`; //recruitID, name, 4DNumber, accessToken, refreshToken, companyID

    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, "Internal Server Error - 1955");
        } else {
            connection.query(craftedSQL, [respUserID, respUserName, participantID, respAccessToken, respRefreshToken, companyID], (err, result) => {
                connection.release();

                if (err) {
                    return callback(err, null, "Internal Server Error - 1374");

                // Created User 
                } else {
                    return callback(err, null, "Participant Created");
                }
            });
        }
    });
};


async function participantStatus(companyID, callback) {
    const craftedSQL = `SELECT 4DNumber FROM recruits WHERE companyID = ?`;

    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, "Internal Server Error - 4573");
        } else {
            connection.query(craftedSQL, [companyID], (err, result) => {
                connection.release();
                if (err) {
                    return callback(err, null, "Internal Server Error - 1743");
                } else {
                    return callback(err, null, result);
                }
            });
        }
    });
};


async function setRefreshToken(dataSet, callback) {
    const updateTokensQuery = `UPDATE recruits SET accessToken = ?, refreshToken = ? WHERE recruitID = ?`;
    const removeRecruitDataQuery = `DELETE FROM data WHERE recruitID = ?`;
    const removeRecruitQuery = `DELETE FROM recruits WHERE recruitID = ?`;

    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, "Internal Server Error - 9843");

        } else {
            let errorData = [];
            let resultData = [];

            const promises = dataSet.map(entry => {
                return new Promise((resolve, reject) => {
                    // Update data with new access & refresh token
                    if ("accessToken" in entry) {
                        connection.query(updateTokensQuery, [entry.accessToken, entry.refreshToken, entry.recruitID], (err, result) => {
                            if (err) {
                                errorData.push({ [entry.recruitID]: err });
                                resolve(err);

                            } else {
                                resultData.push({ [entry.recruitID]: result.info });
                                resolve(result);
                            }
                        });
                    } else {
                        // Remove recruit data from database when he has no Access Token present
                        errorData.push({ [entry.recruitID]: "No Access Token" });
                        connection.query(removeRecruitDataQuery, [entry.recruitID], (err, result) => {
                            if (err) {
                                errorData.push({ [entry.recruitID]: err });
                                resolve(err);

                            } else {
                                // Remove recruit from database when he has no Access Token present
                                connection.query(removeRecruitQuery, [entry.recruitID], (err, result) => {
                                    if (err) {
                                        errorData.push({ [entry.recruitID]: err });
                                        resolve(err);
                                    } else {
                                        resultData.push({ [entry.recruitID]: result.info });
                                        resolve();
                                    }
                                });
                            }
                        });
                    }
                });
            });

            // Execute all promises
            Promise.all(promises).then(() => {
                // Release connection and invoke callback
                connection.release();
                return callback(errorData.length ? errorData : null, null, resultData.length ? resultData : null);
            }).catch(err => {
                // Release connection and handle error
                connection.release();
                return callback(err, null, null);
            });
        };
    });
};


async function getAccessToken(participantID, companyID, callback) {
    const craftedSQL = `SELECT accessToken FROM recruits WHERE companyID = ? AND 4DNumber = ?`;

    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, "Internal Server Error - 8564");

        } else {
            connection.query(craftedSQL, [companyID, participantID], (err, result) => {
                connection.release();
                if (err) {
                    return callback(err, null, "Internal Server Error - 3299");

                } else if (result.length === 0){
                    return callback(err, 0, "No Access Token Found");

                } else {
                    return callback(err, null, result[0]);
                }
            });
        }
    });
};


async function setData(dataSet, date, callback) {
    const addDate = `INSERT INTO data (date, recruitID) VALUES (?, ?)`;
    
    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, "Internal Server Error - 1532");

        } else {
            let errorData = [];
            let resultData = [];

            const promises = dataSet.map(recruitID => {
                return new Promise((resolve, reject) => {
                    connection.query(addDate, [date, recruitID], (err, result) => {
                        if (err) {
                            errorData.push({ [recruitID]: err });
                            resolve(err);
                        } else {
                            resultData.push({ [recruitID]: result.info });
                            resolve(result);
                        };
                    });
                });
            });

            // Execute all promises
            Promise.all(promises).then(() => {
                // Release connection and invoke callback
                connection.release();
                return callback(errorData.length ? errorData : null, null, resultData.length ? resultData : null);
            }).catch(err => {
                // Release connection and handle error
                connection.release();
                return callback(err, null, null);
            });
        }
    });
};


async function modifyRecruitData(dataSet, date, type, callback) {
    let sqlQuery = ``;
    let param = [];
    const updateActivity = `UPDATE data SET steps = ?, calories = ?, distance = ?, activity = ? WHERE recruitID = ? AND date = ?`;
    const updateHeartRate = `UPDATE data SET heartRate = ? WHERE recruitID = ? AND date = ?`;
    const updateSleepActivity = `UPDATE data SET sleep = ? WHERE recruitID = ? AND date = ?`;
    const updatevO2Activity = `UPDATE data SET vO2 = ? WHERE recruitID = ? AND date = ?`;

    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, "Internal Server Error - 1672");
        } else {
            let errorData = [];
            let resultData = [];

            const promises = dataSet.map(entry => {
                return new Promise((resolve, reject) => {
                    
                    if (type === "activity"){
                        const activityJson = entry.activityGroup ? JSON.stringify(entry.activityGroup) : null; // Convert activity group to JSON string
                        sqlQuery = updateActivity;
                        param = [entry.steps, entry.calories, entry.distance, activityJson, entry.recruitID, date];
                    
                    } else if (type === "heartRate"){
                        const heartRateJson = entry.heartRateZone ? JSON.stringify(entry.heartRateZone) : null; // Convert heart rate zone to JSON string
                        sqlQuery = updateHeartRate;
                        param = [heartRateJson, entry.recruitID, date];

                    }  else if (type === "sleep"){
                        const sleepJson = entry.sleepData ? JSON.stringify(entry.sleepData) : null; // Convert sleep data to JSON string
                        sqlQuery = updateSleepActivity;
                        param = [sleepJson, entry.recruitID, date];

                    } else if (type === "vO2"){
                        sqlQuery = updatevO2Activity;
                        param = [entry.vO2, entry.recruitID, date];
                    }
                    
                    connection.query(sqlQuery, param, (err, result) => {
                        if (err) {
                            errorData.push({ [entry.recruitID]: err });
                            resolve(err);
                        } else {
                            resultData.push({ [entry.recruitID]: result.info });
                            resolve(result);
                        }
                    });
                });
            });

            // Execute all promises
            Promise.all(promises).then(() => {
                // Release connection and invoke callback
                connection.release();
                return callback(errorData.length ? errorData : null, null, resultData.length ? resultData : null);
            
            }).catch(err => {
                // Release connection and handle error
                connection.release();
                return callback(err, null, null);
            });
        }
    });
};


async function getAllData(companyID, recruit4D, date, callback) {
    const getRecruitData = `SELECT steps, calories, distance, vO2, sleep, heartRate, activity FROM data INNER JOIN recruits USING (recruitID) WHERE companyID = ? AND 4DNumber = ? AND date = ?`;
    const getCompanyID = `SELECT companyID FROM company WHERE companyID = ?`;

    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, "Internal Server Error - 8564");
        };

        connection.query(getCompanyID, [companyID], (err, result) => {
            if (err) {
                connection.release();
                return callback(err, null, "Internal Server Error - 3299");

            } else if (result.length === 0){
                connection.release();
                return callback(err, 1, "Invalid companyID");
            };

            connection.query(getRecruitData, [companyID, recruit4D, date], (err, result) => {
                connection.release();
                
                if (err){
                    return callback(err, null, "Internal Server Error - 3288");
                } else {
                    return callback(err, null, result);
                };
            });
        });
    });
};


async function getPartData(companyID, date, type, callback) {
    let getRecruitData = '';
    const getCompanyID = `SELECT companyID FROM company WHERE companyID = ?`;

    if (type === 'sleep'){
        getRecruitData = `SELECT 4DNumber, IFNULL(JSON_UNQUOTE(JSON_EXTRACT(sleep, '$[0].durationInBed')), 'Null') AS durationInBed FROM data INNER JOIN recruits USING (recruitID) WHERE companyID = ? AND date = ?`;
    
    } else if (type === 'distance'){
        getRecruitData = `SELECT 4DNumber, distance FROM data INNER JOIN recruits USING (recruitID) WHERE companyID = ? AND date = ?`;
    
    } else if (type === 'calories'){
        getRecruitData = `SELECT 4DNumber, calories FROM data INNER JOIN recruits USING (recruitID) WHERE companyID = ? AND date = ?`;
    
    } else if (type === 'vO2'){
        getRecruitData = `SELECT 4DNumber, vO2 FROM data INNER JOIN recruits USING (recruitID) WHERE companyID = ? AND date = ?`;
    
    } else if (type === 'heartRate'){
        getRecruitData = `SELECT 4DNumber, IFNULL(JSON_UNQUOTE(JSON_EXTRACT(heartRate, '$.rest')), 'Null') AS heartRate FROM data INNER JOIN recruits USING (recruitID) WHERE companyID = ? AND date = ?`;
    
    } else {
        return callback(null, 1, "Invalid parameter value - Type");
    };

    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, "Internal Server Error - 8564");
        };

        connection.query(getCompanyID, [companyID], (err, result) => {
            if (err) {
                connection.release();
                return callback(err, null, "Internal Server Error - 3255");

            } else if (result.length === 0){
                connection.release();
                return callback(err, 1, "Invalid companyID");
            };

            connection.query(getRecruitData, [companyID, date], (err, result) => {
                connection.release();
                
                if (err){
                    return callback(err, null, "Internal Server Error - 3266");
                } else {
                    return callback(err, null, result);
                };
            });
        });
    });
};


async function customSQL(exQuery, values=[], callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null, "Internal Server Error - 5801");
        } else {
            connection.query(exQuery, values, (err, result) => {
                connection.release();
                if (err) {
                    console.log(err);
                    return callback(err, null, "Internal Server Error - 1633");
                } else {
                    return callback(err, null, result);
                };
            });
        };
    });
};


module.exports = {
    callQuery: callQuery,
    validateCompany: validateCompany,
    createUser: createUser,
    loginUser: loginUser,
    createCompany: createCompany,
    checkCompany: checkCompany,
    checkParticpant: checkParticpant,
    createParticpant: createParticpant,
    participantStatus: participantStatus,
    setRefreshToken: setRefreshToken,
    getAccessToken: getAccessToken,
    setData: setData,
    modifyRecruitData: modifyRecruitData,
    getAllData: getAllData,
    getPartData: getPartData,
    customSQL: customSQL
  };