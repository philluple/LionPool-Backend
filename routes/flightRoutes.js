const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { DatabaseError, FlightAlreadyExistsError} = require('./error'); // Adjust the file path accordingly
const { addFlight, deleteFlight} = require("./backend-flight")

const db = admin.firestore();

router.post('/flight/addFlight', async (req, res) => {
	try {
		//Parse the arguments
		const userId = req.query.userId;
	  	const date = req.query.date;
		const airport = req.query.airport;
		await addFlight(userId, date, airport);
		//Send 200 if the flight was added 
		res.status(200);
	} catch (error) {
	  	console.error('Error adding flight:', error);
		if (error instanceof flightExists){
			res.status(400);
		}else{
			res.status(500);
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
		res.status(200)
	} catch (error) {
	  	console.error('Error fetching matches:', error);
	  	res.status(500)
	}
});

module.exports = router;