const express = require('express');
const router = express.Router();
const axios = require('axios');
const {getAuthCode} = require("./instagram")

const clientID = '1326528034640707'; // Corrected typo
const clientSecret = '18099f125a22c5d417c2d92a2dcc935b';
const grantType = 'authorization_code';
const redirectUri = 'https://lion-pool.com/app/';

router.post('/instagram-auth', async (req, res) => {
    try {
		console.log("Recieved something from insta...")
		const userId = req.body.userId
        const code = req.body.code;
		const username = await getAuthCode(userId, code)	
		const data = {
			username: username
		}
		res.status(200).json(data)
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
