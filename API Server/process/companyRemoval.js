const sql = require('../model/database');


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


async function purge(companyID) {
    const deleteData = `DELETE FROM data WHERE recruitID IN (SELECT recruitID FROM recruits WHERE companyID = ?)`;
    const deleteRecruits = `DELETE FROM recruits WHERE companyID = ?`;
    const deleteUsers = `DELETE FROM user WHERE companyID = ?`;
    const deleteCompany = `DELETE FROM company WHERE companyID = ?`;

    try {
        // Delete all recruit's data
        await customSQLAsync(deleteData, [companyID]);

        // Delete all recruits info
        await customSQLAsync(deleteRecruits, [companyID]);

        // Delete all user accounts
        await customSQLAsync(deleteUsers, [companyID]);

        // Delete company
        await customSQLAsync(deleteCompany, [companyID]);

    } catch (err) {
        console.log(err);
    }
};


async function main(companyID = null, expiryCheck = null) {
    // Check for Expiry Date
    const getCompanyExpiry = `SELECT companyID, tokenExpiry FROM company`;

    if (expiryCheck) {
        try {
            const msg = await customSQLAsync(getCompanyExpiry);
            const currentDate = new Date();

            // Loop through the array of objects with promise
            const purgePromises = msg.map(async (item) => {
                const tokenExpiryDate = new Date(item.tokenExpiry);

                if (currentDate > tokenExpiryDate && item.companyID !== "All") {
                    console.log(`[+] ${item.companyID} has expired and removed.`);
                    await purge(item.companyID);

                } else {
                    console.log(`[+] ${item.companyID} is still valid.`);
                };
            });

            await Promise.all(purgePromises);
            console.log("[+] All companies checked for expiry.");
            process.exit(0); // Exit after all purge operations are completed
                    
        } catch (err) {
            console.log(err);
            process.exit(1); // Exit with error code 1
        };

    } else if (companyID) {
        // Execute without checking for expiry date
        await purge(companyID);
        console.log(`[+] Removed ${companyID}`);
    };
};



// Check if the script is executed directly
if (require.main === module) {
    main(null, 1);
};

module.exports = {main};
