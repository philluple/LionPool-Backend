const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

const { databaseError, flightExistsError} = require('./utils/error'); // Adjust the file path accordingly
const { addFlight, deleteFlight} = require("./flightOps")

const db = admin.firestore();

router.post('/flight/addFlight', async (req, res) => {
	try {
		const userId = req.body.userId;
	  	const date = req.body.date;
		const airport = req.body.airport;
		const result = await addFlight(userId, date, airport);
		console.log("Flight ID:", result.id);
		console.log("User ID:", result.userId);
		console.log("Airport:", result.airport);
		console.log("Date:", result.date);
		console.log("Found Match:", result.foundMatch);
		//Send 200 if the flight was added 
		console.log("User: "+userId+" added a flight successfully!")
		res.status(200).json(result);
	} catch (error) {
	  	console.error('Error adding flight:', error);
		if (error instanceof flightExistsError){
			console.log("here")
			res.status(400).json({});
		}else{
			res.status(500).json({});
		}
	}
});


router.post('/flight/deleteFlight', async (req, res) => {
	try {
		//call match function
		const flightId = req.query.flightId;
	  	const userId = req.query.userId;
		const airport = req.query.airport;
		await deleteFlight(flightId, userId, airport);
		console.log("Flight: "+flightId+" from user: "+userId+" deleted successfully!")
		res.status(200)
	} catch (error) {
	  	console.error('Error fetching matches:', error);
	  	res.status(500)
	}
});

module.exports = router;