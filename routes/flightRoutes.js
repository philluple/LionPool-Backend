const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

const { databaseError, flightExistsError} = require('./utils/error'); // Adjust the file path accordingly
const { addFlight, deleteFlight, fetchFlights, fetchRequests, fetchInRequests} = require("./flightOps")

const db = admin.firestore();

router.get('/user/fetchInRequests', async (req, res) => {
	try {
		const userId = req.query.userId;
		const result = await fetchInRequests(userId);
		console.log("Sending user: "+userId+" their requests")
		res.status(200).json(result);
		console.log(result)
	} catch (error) {
		console.error('Error fetching requests: ', error);
		res.status(500).json({});
	}
});

router.get('/user/fetchRequests', async (req, res) => {
	try {
		const userId = req.query.userId;
		const result = await fetchRequests(userId);
		console.log("Sending user: "+userId+" their requests")
		res.status(200).json(result);
		console.log(result)
	} catch (error) {
		console.error('Error fetching requests: ', error);
		res.status(500).json({});
	}
});

router.post('/flight/addFlight', async (req, res) => {
	try {
		const userId = req.body.userId;
	  	const date = req.body.date;
		const airport = req.body.airport;
		const result = await addFlight(userId, date, airport);
		console.log("User: "+userId+" added a flight successfully!")
		res.status(200).json(result);
	} catch (error) {
	  	console.error('Error adding flight: ', error);
		if (error instanceof flightExistsError){
			res.status(400).json({});
		}else{console
			res.status(500).json({});
		}
	}
});

router.get('/user/fetchFlights', async (req, res) => {
	try {
		const userId = req.query.userId;
		const result = await fetchFlights(userId);
		res.status(200).json(result);
	} catch (error) {
	  	console.error('Error adding flight:', error);
		if (error instanceof flightExistsError){
			console.log("here")
			res.status(400).json({});
		}else{console
			res.status(500).json({});
		}
	}
});

router.get('/flight/deleteFlight', async (req, res) => {
	try {
		//call match function
		const flightId = req.query.flightId;
	  	const userId = req.query.userId;
		const airport = req.query.airport;
		await deleteFlight(flightId.toLowerCase(), userId, airport);
		console.log("Flight: "+flightId+" from user: "+userId+" deleted successfully!")
		res.status(200).json({})
	} catch (error) {
	  	console.error('Error fetching matches:', error);
	  	res.status(500).json({})
	}
});

module.exports = router;