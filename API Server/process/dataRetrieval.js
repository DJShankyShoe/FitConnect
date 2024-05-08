const sql = require('../model/database');
const axios = require('axios');
const currentDate = new Date().toISOString().substring(0, 10);

function main(currentDate){
    const exctractAllRecruitID = `SELECT recruitID, accessToken FROM recruits`;
    const exctractRecruitIDDate = `SELECT recruitID FROM data WHERE date = ?`;

    // Extract all recruitID in recruits table
    sql.customSQL(exctractAllRecruitID, [], (err, result, allRecruitID) => {
        if (err){
            console.log(err);

        } else {
            // Extract all recruitID with current date in date table
            sql.customSQL(exctractRecruitIDDate, [currentDate], (err, result, msg) => {
                
                const dataRecruitID = new Set(msg.map(item => item.recruitID)); // Extract recruitIDs from table data
                const finalDiffRecruitID = allRecruitID.filter(item => !dataRecruitID.has(item.recruitID)).map(item => item.recruitID); // Filter recruitIDs from "data" that are not present in "recruits" table

                // Inserting Current Date rows under data
                if (finalDiffRecruitID.length > 0){
                    console.log("[*] Inserting Columns for " + currentDate + " - " + finalDiffRecruitID)
                    
                    sql.setData(finalDiffRecruitID, currentDate, (err, result, value) => {
                        if (err){
                            console.log(err);
                        } else {
                            dataExtraction(allRecruitID, currentDate).then(() => {
                                console.log("[+] Inserted Successfully");
                                process.exit(0);
                            }).catch(err => {
                                console.log(err);
                                process.exit(0);
                            });
                        }
                    });
                } else {
                    dataExtraction(allRecruitID, currentDate).then(() => {
                        console.log("[+] Inserted Successfully");
                        process.exit(0);
                    }).catch(err => {
                        console.log(err);
                        process.exit(0);
                    });
                }
            });
        }
    });
};

function customExec(participantNo, companyID, date) {
    return new Promise((resolve, reject) => {

        const placeholders = participantNo.map(() => '?').join(', '); // Creates a comma-separated string of placeholders
        const exctractSelectedRecruitID = `SELECT recruitID, accessToken FROM recruits WHERE 4DNumber IN (${placeholders}) AND companyID = ?`;

        const queryParameters = [participantNo, companyID].flat();
        sql.customSQL(exctractSelectedRecruitID, queryParameters, (err, result, allRecruitID) => {
            if (err){
                console.log(err);

            } else {
                // Filter non-successfull allRecruitID connection
                testConnection(allRecruitID, currentDate).then(allRecruitID => {
                    // Use the updated dataSet here
                    const dataRecruitID = allRecruitID.map(item => item.recruitID); // Extract recruitIDs from table data

                    if (dataRecruitID.length > 0){
                        // Inserting Current Date rows under data
                        console.log("[*] Inserting Columns for " + date + " - " + participantNo)
                        sql.setData(dataRecruitID, date, (err, result, value) => {
                            if (err){
                                console.log(err);
                                reject(err);
                            } else {
                                console.log("[+] Inserted Successfully");
                                dataExtraction(allRecruitID, date).then(() => {
                                    resolve();
                                    console.log("[+] Data Extraction Completed");
                                }).catch(error => {
                                    reject(error);
                                });
                            }
                        });
                    };
                })
                .catch(error => {
                    // Handle any errors
                    console.error("Error:", error);
                });
            }
        });
    });
};

function testConnection(dataSet, date){
    return new Promise((resolve, reject) => {

        // Array to store all Axios promises
        const axiosPromises = [];

        // Loop through every recruit for access token
        dataSet.forEach(entry => {
            let headers = {
                'Authorization': `Bearer ${entry.accessToken}`,
                'Accept': 'application/json'
            };

            axiosPromises.push(
                axios.get(`https://api.fitbit.com/1/user/-/cardioscore/date/${date}.json`, { headers }).then(vO2Response => {
                }).catch(error => {
                    // remove current entry from dataSet
                    dataSet = dataSet.filter(item => item !== entry);
                    console.log(error.message + " - Data Retrieval vO2");
                })
            );
        });

        // Wait for all Axios promises to resolve
        Promise.all(axiosPromises).then(() => {
            // Resolve with the updated dataSet
            resolve(dataSet);

        }).catch(error => {
            console.log(error);
            reject(error);
            resolve(dataSet);
        });
    });
};

async function dataExtraction(dataSet, date) {
    if (dataExtraction.length > 100){
        // Execute in series
        try {
            await activity(dataSet, date);
            await heartRate(dataSet, date);
            await sleep(dataSet, date);
            await vO2(dataSet, date);

        } catch (error) {
            console.error("[-] Error occurred during series data extraction", error);
        }

    } else {
        // Execute in parallel
        try {
            await Promise.all([
                activity(dataSet, date),
                heartRate(dataSet, date),
                sleep(dataSet, date),
                vO2(dataSet, date)
            ]);
        } catch (error) {
            console.error("[-] Error occurred during parallel data retrieval", error);
        }
    }
    
};

function activity(dataSet, date){
    return new Promise((resolve, reject) => {

        // Array to store all Axios promises
        const axiosPromises = [];

        // Loop through every recruit for access token
        dataSet.forEach(entry => {
            let headers = {
                'Authorization': `Bearer ${entry.accessToken}`,
                'Accept': 'application/json'
            };

            axiosPromises.push(
                axios.get(`https://api.fitbit.com/1/user/-/activities/date/${date}.json`, { headers }).then(activityResponse => {
                    // Basic Data
                    entry.steps = activityResponse.data.summary.steps;
                    entry.calories = activityResponse.data.summary.caloriesOut;
                    entry.distance = activityResponse.data.summary.distances.find(entry => entry.activity === "total").distance; // Find the object with activity "total"

                    // Activity Group Data
                    entry.activityGroup = activityResponse.data.activities.map(activity => {
                        return {
                            name: activity.name,
                            time: activity.startTime,
                            duration: (activity.duration / 60000).toFixed(2), // Converting ms to min
                            distance: activity.distance ? (activity.distance).toFixed(4) : null,
                            pace: activity.distance ? ((activity.duration / 60000) / activity.distance).toFixed(2) : null,
                            calories: activity.calories,
                            steps: activity.steps
                        };
                    });
                    if (entry.activityGroup && entry.activityGroup.length === 0) {
                        entry.activityGroup = null;
                    };
                }).catch(error => {
                    console.log(error.message + " - Data Retrieval Activities");
                })
            );
        });

        // Wait for all Axios promises to resolve
        Promise.all(axiosPromises).then(() => {
            sql.modifyRecruitData(dataSet, date, "activity", (err, result, msg) => {
                if (err){
                    console.log(err);
                    reject(err);
                } else {
                    resolve();
                    console.log("[+] Activity data retrieved and processed");
                }
            });
        }).catch(error => {
            reject(error);
        });
    });
};

function heartRate(dataSet, date){
    return new Promise((resolve, reject) => {

        // Array to store all Axios promises
        const axiosPromises = [];

        // Loop through every recruit for access token
        dataSet.forEach(entry => {
            let headers = {
                'Authorization': `Bearer ${entry.accessToken}`,
                'Accept': 'application/json'
            };

            axiosPromises.push(
                axios.get(`https://api.fitbit.com/1/user/-/activities/heart/date/${date}/1d.json`, { headers }).then(heartRateResponse => {
                    // Heart Rate Data
                    entry.heartRateZone = {
                        zone: heartRateResponse.data["activities-heart"][0].value.heartRateZones,
                        rest: heartRateResponse.data["activities-heart"][0].value.restingHeartRate
                    };
                    if (entry.heartRateZone && entry.heartRateZone.length === 0) {
                        entry.heartRateZone = null;
                    };

                }).catch(error => {
                    console.log(error.message + " - Data Retrieval Heart Rate");
                })
            );
        });

        // Wait for all Axios promises to resolve
        Promise.all(axiosPromises).then(() => {
            sql.modifyRecruitData(dataSet, date, "heartRate", (err, result, msg) => {
                if (err){
                    console.log(err);
                    reject(err);
                } else {
                    resolve();
                    console.log("[+] Heart Rate data retrieved and processed");
                }
            });
        }).catch(error => {
            reject(error);
        });
    });
};

function sleep(dataSet, date){
    return new Promise((resolve, reject) => {

        // Loop through every recruit for access token
        const axiosPromises = dataSet.map(entry => {
            let headers = {
                'Authorization': `Bearer ${entry.accessToken}`,
                'Accept': 'application/json'
            };

            // Request Sleep Data
            return axios.get(`https://api.fitbit.com/1.2/user/-/sleep/date/${date}.json`, { headers }).then(sleepResponse => {
                const options = { timeZone: "Asia/Singapore", hour12: false }; // Convert UTC time to GMT+8 timezone

                entry.sleepData = sleepResponse.data.sleep.map(sleep => {
                    let endTime = new Date(sleep.endTime);
                    let startTime = new Date(endTime.getTime() - sleep.duration);

                    let startTimeSGT = startTime.toLocaleString("en-US", options);
                    let endTimeSGT = endTime.toLocaleString("en-US", options);

                    return {
                        startTime: startTimeSGT,
                        endTime: endTimeSGT,
                        durationInBed: (sleep.timeInBed / 60).toFixed(2),
                        durationAsleep: (sleep.minutesAsleep / 60).toFixed(2)
                    };
                });

                if (entry.sleepData.length > 0) {
                    // Request breathing rate
                    return axios.get(`https://api.fitbit.com/1/user/-/br/date/${date}.json`, { headers }).then(breathRateResponse => {
                        entry.sleepData.map(sleepEntry => {
                            sleepEntry.breathingRate = breathRateResponse.data.br[0]?.value?.breathingRate;
                        });
                    }).catch(error => {
                        console.log(error.message + " - Data Retrieval Breathing Rate");
                    });
                } else {
                    entry.sleepData = null;
                };
                
            }).catch(error => {
                console.log(error.message + " - Data Retrieval Sleep Rate");
            });
        });
        
        Promise.all(axiosPromises).then(() => {
            sql.modifyRecruitData(dataSet, date, "sleep", (err, result, msg) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    resolve();
                    console.log("[+] Sleep data retrieved and processed")
                }
            });
        }).catch(error => {
            reject(error);
        });
    });
};

function vO2(dataSet, date){
    return new Promise((resolve, reject) => {

        // Array to store all Axios promises
        const axiosPromises = [];

        // Loop through every recruit for access token
        dataSet.forEach(entry => {
            let headers = {
                'Authorization': `Bearer ${entry.accessToken}`,
                'Accept': 'application/json'
            };

            axiosPromises.push(
                axios.get(`https://api.fitbit.com/1/user/-/cardioscore/date/${date}.json`, { headers }).then(vO2Response => {
                    // vO2 Max Data
                    entry.vO2 = vO2Response.data.cardioScore[0].value.vo2Max;

                }).catch(error => {
                    console.log(error.message + " - Data Retrieval vO2");
                })
            );
        });

        // Wait for all Axios promises to resolve
        Promise.all(axiosPromises).then(() => {
            sql.modifyRecruitData(dataSet, date, "vO2", (err, result, msg) => {
                if (err){
                    console.log(err);
                    reject(err);
                } else {
                    resolve();
                    console.log("[+] vO2 Max data retrieved and processed");
                }
            });
        }).catch(error => {
            reject(error);
        });
    });
};

// Check if the script is executed directly
if (require.main === module) {
    main(currentDate);
    // customExec([4115], "Orion0423", "2024-04-02");
};

module.exports = {customExec};