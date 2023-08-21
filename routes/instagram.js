const express = require('express');
const router = express.Router();
const axios = require('axios');

const clientID = '944516796642954'; // Corrected typo
const clientSecret = '52bcc36c043946b59a56ebd039209e0d';
const grantType = 'authorization_code';
const redirectUri = 'https://lion-pool.com/api/instagram-callback';

router.get('/instagram-callback', async (req, res) => {
    try {
        const code = req.query.code;
        const requestData = {
            client_id: clientID,
            client_secret: clientSecret,
            grant_type: grantType,
            redirect_uri: redirectUri,
            code: code
        };

        const response = await axios.post(
            'https://api.instagram.com/oauth/access_token',
            new URLSearchParams(requestData).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        console.log(response.data);
        // Handle the response data as needed
    } catch (error) {
        console.log(error);
    }
});



// router.get('/instagram-callback', async (req, res) => {
//     try {
//         const code = req.query.code;
//         const response = await axios.post(
//             'https://api.instagram.com/oauth/access_token',
//             {
//                 params: {
//                     client_id: clientID,
//                     client_secret: clientSecret,
//                     grant_type: grantType,
//                     redirect_uri: redirectUri,
//                     code: code
//                 }
//             }
//         );
//         console.log(response.data);
//         // Handle the response data as needed
//     } catch (error) {
//         console.log(error);
//     }
// });

router.get('/deauthorize', async (req, res) => {
    console.log(req.query);
    // Handle deauthorization request
});

router.get('/deletion', async (req, res) => {
    console.log(req.query);
    // Handle deletion request
});

module.exports = router;
