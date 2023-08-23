const express = require('express');
const router = express.Router();
const axios = require('axios');

const clientID = '1326528034640707'; // Corrected typo
const clientSecret = '18099f125a22c5d417c2d92a2dcc935b';
const grantType = 'authorization_code';
const redirectUri = 'https://lion-pool.com/app/';

router.post('/instagram-auth', async (req, res) => {
    try {
		console.log("Recieved something from insta...")
		const userId = req.body.userId
        const code = req.body.code;

        const requestData = {
            client_id: clientID,
            client_secret: clientSecret,
            grant_type: grantType,
            redirect_uri: redirectUri,
            code: code
        };

        const response_1 = await axios.post(
            'https://api.instagram.com/oauth/access_token',
            new URLSearchParams(requestData).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

		if (response_1.data){
			// Note: store these in db 
			const access_token = response_1.data["access_token"]
			const insta_lion_user_id =response_1.data["user_id"]

			const url = `https://graph.instagram.com/${insta_lion_user_id}?fields=id,username&access_token=${access_token}`;

			const response_2 = await axios.get(url)
				.then(response => {
					const instagram_id = response.data["id"]
					const username = response.data["username"]
					console.log(instagram_id, username)
				})
		}else{
			throw(error)
		}   

    } catch (error) {
        console.log(error);
    }
});


router.get('/deauthorize', async (req, res) => {
    console.log(req.query);
    // Handle deauthorization request
});

router.get('/deletion', async (req, res) => {
    console.log(req.query);
    // Handle deletion request
});

module.exports = router;
