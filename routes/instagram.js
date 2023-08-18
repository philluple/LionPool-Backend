const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');


router.get('/instagram-callback', async (req, res) => {
	try {
		const authorizationCode = req.query.code;
		console.log(authorizationCode)
	} catch (error) {
	  	console.log(error)
	}
});

router.get('/deauthorize', async (req, res) => {
	console.log(req)
});

router.get('/deletion', async (req, res) => {
	console.log(req)
});

module.exports = router;