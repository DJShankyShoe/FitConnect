const sql = require('../model/database');
const axios = require('axios');
const query = `SELECT recruitID, refreshToken FROM recruits ORDER BY recruitID`;

const auth = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');

const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded',
};

sql.customSQL(query, [], (err, result, msg) => {
    if (err){
        console.log(msg);
    } else {
        // Array to store all Axios promises
        const axiosPromises = [];

        // Loop through every refresh token
        msg.forEach(entry => {
            let postData = {
                client_id: process.env.CLIENT_ID,
                grant_type: 'refresh_token',
                refresh_token: entry.refreshToken,
            };

            // Push each Axios promise into the array
            axiosPromises.push(
                axios.post('https://api.fitbit.com/oauth2/token', new URLSearchParams(postData), { headers }).then(response => {
                    entry.refreshToken = response.data.refresh_token;
                    entry.accessToken = response.data.access_token;
                }).catch(error => {
                    console.log(error.message);
                })
            );
        });

        // Wait for all Axios promises to resolve
        Promise.all(axiosPromises).then(() => {
            sql.setRefreshToken(msg, (err, result, msg) => {
                console.log(msg);
                console.log(err);
                process.exit(0);
            });
        });
    }
});

