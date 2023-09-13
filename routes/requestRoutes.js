const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const { databaseError, flightExistsError} = require('./utils/error'); // Adjust the file path accordingly
const { sendRequest, acceptRequest, rejectRequest, fetchInRequests, fetchOutRequests, updateNotify} = require("./request")
const db = admin.firestore();



router.get('/request/updateNotify', async (req, res) => {
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

router.get('/request/fetchInRequests', async (req, res) => {
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

router.get('/request/fetchOutRequests', async (req, res) => {
	try {
		const userId = req.query.userId;
		const result = await fetchOutRequests(userId);
		console.log("Sending user: "+userId+" their requests")
		res.status(200).json(result);
	} catch (error) {
		console.error('Error fetching requests: ', error);
		res.status(500).json({});
	}
});

router.get('/request/reject', async (req, res) => {
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


router.post('/request/accept', async (req, res) => {
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
		const match = await acceptRequest(requestId, recieverFlightId, recieverName, recieverUserId,
			recieverPfp, senderFlightId, senderName, senderUserId, senderPfp, date, airport);
		console.log(match);
		res.status(200).json(match);
		console.log(recieverUserId+" accepted "+senderUserId+"'s request");
	}catch (error){
		console.error("Error accepted request, ", error)
		res.status(500).json({});
	}
});


router.get('/request/send', async (req, res) => {
	try {
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

module.exports = router;
