const express = require('express');
const router = express.Router();
const axios = require('axios');
const {instagramSetup, fetchFeed} = require("./instagram")

const clientID = '1326528034640707'; // Corrected typo
const clientSecret = '18099f125a22c5d417c2d92a2dcc935b';
const grantType = 'authorization_code';
// const redirectUri = 'https://lion-pool.com/app';

router.get('/fetchFeed', async (req, res) => {
	try {
		console.log("Fetching user feed")
		const userId = req.query.userId;
		console.log(userId)
		const data = await fetchFeed(userId);
		console.log(data)
		res.status(200).json(data)
	} catch (error) {
		res.status(404).json({})
	}
});

router.post('/instagram-auth', async (req, res) => {
    try {
		const userId = req.body.userId
        const code = req.body.code;
		const data = await instagramSetup(userId, code);
		console.log(data)
		// console.log(data);
		res.status(200).json(data);
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