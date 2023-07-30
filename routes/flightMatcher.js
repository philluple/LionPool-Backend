const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const { v1: uuidv1, v4: uuidv4,} = require('uuid');


const {isoToCustomFormat, timestampToISO} = require('./utils/timeUtils')
const {noFlightError} = require('./utils/error'); 

const bucket = admin.storage().bucket();


const moment = require('moment');
const { request } = require('express');
const db = getFirestore();

async function sendRequest(senderFlightId, senderUserId, recieverFlightId, recieverUserId){
	return new Promise(async(resolve, reject) => {
		/*
		Flow: 
		requester sends a request, the open request gets written to sentRequests collection within upon acceptance, it moves to the matches 
		reciever recieves the request in inRequests, upon accept, gets moved to matches 
		*/
		const matchId = uuidv1();

		//References for data
		const senderRef = db.collection('users').doc(senderUserId).collection('outRequests').doc(matchId);
		const recieverRef = db.collection('users').doc(recieverUserId).collection('inRequests').doc(matchId);
		
		//Get basic info to populate data
		try{
			const senderInfoQuery = await db.collection('users').doc(senderUserId).get()
			const recieverInfoQuery = await db.collection('users').doc(recieverUserId).get()
			const senderFlightQuery = await db.collection('users').doc(senderUserId).collection('userFlights').doc(senderFlightId).get()
			const senderName = senderInfoQuery.data()['firstname']+' '+senderInfoQuery.data()['lastname'];
			const senderPfp = senderInfoQuery.data()['pfpLocation']
			const recieverName = recieverInfoQuery.data()['firstname']+' '+recieverInfoQuery.data()['lastname'];
			const recieverPfp = recieverInfoQuery.data()['pfpLocation'];
			const flightDateStamp = senderFlightQuery.data()['date'];
			const flightDate = timestampToISO(flightDateStamp);
			const airport = senderFlightQuery.data()['airport'];
			const requestDate = Timestamp.now()

			const recieverData = {
				id: matchId,
				flightId: recieverFlightId,
				senderFlightId: senderFlightId,
				name: senderName,
				userId: senderUserId,
				requestDate: requestDate,
				flightDate: flightDateStamp,
				pfpLocation: senderPfp, 
				airport: airport, 
				status: "PENDING"
			};
			
			const formattedDate = timestampToISO(requestDate);

			const senderData = {
				id: matchId, 
				senderFlightId: senderFlightId,
				recieverFlightId: recieverFlightId,
				name: recieverName, 
				recieverUserId: recieverUserId, 
				requestDate: requestDate,
				flightDate: flightDateStamp,
				pfpLocation: recieverPfp,
				airport: airport, 
				status: "PENDING"

			};

			const senderDataToFront = {
				id: matchId, 
				senderFlightId: senderFlightId,
				recieverFlightId: recieverFlightId,
				recieverUserId: recieverUserId, 
				date: flightDate,
				pfp: recieverPfp,
				name: recieverName, 
				status: "PENDING",
				airport: airport
			};

			await senderRef.set(senderData);
			await recieverRef.set(recieverData);
			resolve(senderDataToFront);

		}catch(error){
			reject(error)
		}
	});
}
async function getMatches(flightId, userId, airport){
	return new Promise(async(resolve, reject) => {

		// DB References
		const confirmRef = db.collection('flights').doc(airport).collection('userFlights').doc(`${flightId}-${userId}`);
		const airportRef = db.collection('flights').doc(airport).collection('userFlights');
		const matches = [];
		const results = [];
		var requesterFlightDate; 
	
		try {

			// Ensure flight exists
			const newFlight = await confirmRef.get();

			if (newFlight.exists) {

				// SUBJECT TO CHANGE: Define the time range for matching
				const newFlightDate = newFlight.data()['date'];
				const timeRange = 3 * 60 * 60 * 1000; // 3 hours
				const startTime = new Date(newFlightDate.toDate().getTime() - timeRange);
				const endTime = new Date(newFlightDate.toDate().getTime() + timeRange);
				
				const flightsInRange = await airportRef
					.where('date', '>=', startTime)
					.where('date', '<=', endTime)
					.get();
				
				// Case: Only own flight is within range 
				if (flightsInRange.length==1){
					resolve(results);
				} 
				//Case: Other flights within range
				else{
					const res = await confirmRef.update({foundMatch:true})
					flightsInRange.forEach((flight)=>{
						if (flight.data()['userId']!= userId){
							matches.push(flight);
						}
					});
				}
			} else {
				throw new noFlightError();
			}
			for(const flight of matches){
				const request = await db.collection('users').doc(flight.data()['userId']).get();
				const date = timestampToISO(flight.data()['date']); // Convert Firestore Timestamp to ISO8601 string
				const name = request.data()['firstname']+" "+request.data()['lastname']
				const pfp = request.data()['pfpLocation'];		
				results.push({
					id: uuidv1(),
					senderFlightId: flightId,
					recieverFlightId: flight.data()['id'],
					recieverUserId : flight.data()['userId'],
					date: date,
					pfp: pfp,
					name: name
				});
			}

			resolve(results);
			
		} catch (error) {
		  	reject(error);
		}
	})
	
}

async function writeMatches(potentialMatches, airport, userId, requesterFlightDate, flightId){
	const currentUser = await db.collection('users').doc(userId).get();
	var name = currentUser.data()['firstname']+" "+currentUser.data()['lastname'];
	const currentUserImage = currentUser.data()['pfpLocation'];
	
	//what is added to the current user
	const addedFlight = {
		flightId: flightId,
		userId: userId, 
		pfp: currentUserImage, 
		date: requesterFlightDate,
		name: name
	};
	
	try{
		for(const match of potentialMatches){
			const newDocument = isoToCustomFormat(requesterFlightDate)+"-"+userId;
			const res = await db.collection('users').doc(match.userId).collection('userFlights').doc(match.id).collection('matches').doc(newDocument).set(addedFlight);
		}
	
		//now add each match the requestedUsers own instances
		for(const match of potentialMatches){
			const newDocument = isoToCustomFormat(match.date)+"-"+match.userId;
			console.log(match)
			const res = await db.collection('users').doc(userId).collection('userFlights').doc(flightId).collection('matches').doc(newDocument).set(match);
		}
	}catch (error){
		console.error("ERROR: "+error);
	}
	//go to each match and add the requestedUser
	
}

module.exports = {
	getMatches, 
	sendRequest
};
  
  
