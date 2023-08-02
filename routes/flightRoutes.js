const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const { databaseError, flightExistsError} = require('./utils/error'); // Adjust the file path accordingly
const { addFlight, deleteFlight, fetchFlights, fetchRequests, fetchInRequests, rejectRequest, updateNotify, acceptRequest, fetchMatches} = require("./flightOps")
// const bucket = admin.storage().bucket();
const db = admin.firestore();

// const imageFileName = 'profile-images/GNdVcd3KBPMrlFKo5Lbci5CJnrg2-pfp.jpg'; // Replace with the actual image path in your Firebase Storage

router.get('/user/updateNotify', async (req, res) => {
	try{
		const flightId = req.query.flightId;
		const userId = req.query.userId;
		await updateNotify(flightId.toLowerCase(), userId);
		res.status(200).json({});
		console.log("Updated "+userId+" notification status");
	}catch (error){
		console.error("Error updating notification status ", error)
		res.status(500).json({});
	}
});

router.get('/user/fetchMatches', async (req, res) => {
	try{

		const userId = req.query.userId
		const matches = await fetchMatches(userId)
		res.status(200).json(matches);
		console.log(matches)
	}catch(error){
		console.error("Error fetching matches: ", error)
		res.status(500).json({});
	}
});

router.post('/user/acceptRequest', async (req, res) => {
	try{
		const requestId = req.body.requestId.toLowerCase()
		const recieverFlightId = req.body.recieverFlightId.toLowerCase();
		const recieverName = req.body.recieverName;
		const recieverUserId = req.body.recieverUserId;
		const recieverPfp = req.body.recieverPfp;
		const senderFlightId = req.body.senderFlightId.toLowerCase();
		const senderName = req.body.senderName;
		const senderUserId = req.body.senderUserId;
		const senderPfp = req.body.senderPfp;
		const date = req.body.date;
		const airport = req.body.airport;
		await acceptRequest(requestId, recieverFlightId, recieverName, recieverUserId,
			recieverPfp, senderFlightId, senderName, senderUserId, senderPfp, date, airport);
		res.status(200).json({});
		console.log(recieverUserId+" accepted "+senderUserId+"'s request");
	}catch (error){
		console.error("Error accepted request, ", error)
		res.status(500).json({});
	}
});

router.get('/user/rejectRequest', async (req, res) => {
	try{
		const requestId = req.query.id;
		const recieverUserId = req.query.recieverUserId;
		const senderUserId = req.query.senderUserId;
		await rejectRequest(requestId.toLowerCase(), recieverUserId, senderUserId);
		res.status(200).json({});
		console.log(recieverUserId+" rejected "+senderUserId+"'s request");
	}catch (error){
		console.error("Error rejecting request, ", error)
		res.status(500).json({});
	}
});

router.get('/fetchImage', async (req, res) => {
	try {
		const url = req.query.url;
		const imagePath = url.split('/');
		const imageFileName = 'profile-images/'+imagePath[imagePath.length-1];
		const file = bucket.file(imageFileName);
		const fileBuffer = await file.download();
		// Encode the image with base64
		const base64ImageData = fileBuffer[0].toString('base64');
		console.log('Base64-encoded image data:', base64ImageData);
		res.json({ image: base64ImageData }); // Send the base64-encoded image data to the frontend
	  } catch (error) {
		console.error('Error downloading or encoding image:', error);
		res.status(500).json({ error: 'Internal server error.' });
	  }
	});
  
router.get('/user/fetchInRequests', async (req, res) => {
	try {
		const userId = req.query.userId;
		const result = await fetchInRequests(userId);
		console.log("Sending user: "+userId+" their in requests")
		res.status(200).json(result);
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