const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const getStream = require('get-stream');
const { getStorage } = require('firebase/storage');


router.get('/base', async (req, res) => {
	try {
		console.log("Here")
		res.status(200).send("Hello world");
	}catch (error) {
		res.status(500);
	}
});

module.exports = router;
