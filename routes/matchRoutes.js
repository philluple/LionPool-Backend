const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const {getMatches, sendRequest} = require("./flightMatcher")

const db = admin.firestore();

router.get('/matches/request', async (req, res) => {
	try {
		console.log()
		//Sender
		const senderFlightId = req.query.senderFlightId;
		const senderUserId = req.query.senderUserId;
		//Reciever 
		const recieverFlightId = req.query.recieverFlightId;
		const recieverUserId = req.query.recieverUserId;
		const result = await sendRequest(senderFlightId.toLowerCase(), senderUserId, recieverFlightId.toLowerCase(), recieverUserId);
		res.status(200).json(result);
		console.log("User: "+senderFlightId+" sent request to user: "+recieverUserId)
	} catch(error){
		console.error('ERROR(sendRequest): ', error);
		res.status(500).json({});
	}
});

router.get('/matches', async (req, res) => {
	const results = [];
	try {
		//call match function
		const flightId = req.query.flightId;
		const userId = req.query.userId;
		const airport = req.query.airport;
		const results = await getMatches(flightId.toLowerCase(), userId, airport);
		if (results.length == 0){
			res.status(204).json(results);
			console.log("Returning no matches for user: "+userId);
		} else{
			console.log(results.length+" matches for user: "+userId);
			res.status(200).json(results);
		}
	} catch (error) {
	  	console.error('ERROR(getMatches):', error);
	  	res.status(500).json({error: 'Failed to fetch matches'});
	}
  });

module.exports = router;