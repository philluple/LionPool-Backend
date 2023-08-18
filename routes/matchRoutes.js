const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const {findMatch, fetchMatches} = require("./match.js")

router.get('/match/fetchMatches', async (req, res) => {
	try{
		const userId = req.query.userId
		const matches = await fetchMatches(userId)
		res.status(200).json(matches);
	}catch(error){
		console.error("Error fetching matches: ", error)
		res.status(500).json({});
	}
});

router.get('/match/findMatch', async (req, res) => {
	const results = [];
	try {
		//call match function
		const flightId = req.query.flightId;
		const userId = req.query.userId;
		const airport = req.query.airport;
		const results = await findMatch(flightId.toLowerCase(), userId, airport);
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