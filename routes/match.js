const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter, QueryDocumentSnapshot } = require('firebase-admin/firestore');
const { databaseError, flightExistsError, writeMatchesError, noFlightError} = require('./utils/error'); // Adjust the file path accordingly
const {isoToCustomFormat, timestampToISO} = require('./utils/timeUtils');
const { v1: uuidv1} = require('uuid');
const serviceAccount = require('../lion-pool-f5755-firebase-adminsdk-zzm20-5b403629fd.json');
const admin = require('firebase-admin');
const { request } = require('express');
const db = getFirestore();


async function fetchMatches(userId){
	return new Promise(async(resolve, reject) => {
		matches = []
	try{

		const matchesSnapshot = await db.collection('users').doc(userId).collection('matches').get();
		if (!matchesSnapshot.empty){
			matchesSnapshot.forEach(doc => {
				matches.push({
					id: doc.data()['id'], 
					flightId: doc.data()['flightId'],
					matchFlightId: doc.data()['matchFlightId'],
					matchUserId: doc.data()['matchUserId'],
					date: (doc.data()['date']).toDate().toISOString(),
					pfp: doc.data()['pfp'],
					name: doc.data()['name'], 
					notify: doc.data()['notify'],
					airport: doc.data()['airport']
				});
			});
			resolve(matches);
		}
		resolve(matches)
	}catch(error){
		reject(error)
	}
	});
}

async function findMatch(flightId, userId, airport){
	return new Promise(async(resolve, reject) => {

		// DB References
		const confirmRef = db.collection('flights').doc(airport).collection('userFlights').doc(`${flightId}-${userId}`);
		console.log(`${flightId}-${userId}`)
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
					// const res = await confirmRef.update({foundMatch:true})
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
				console.log(flight.data()['userId']);
				const date = timestampToISO(flight.data()['date']); // Convert Firestore Timestamp to ISO8601 string
				const name = request.data()['firstname']+" "+request.data()['lastname']
				const pfp = request.data()['pfpLocation'];		
				results.push({
					id: uuidv1(),
					flightId: flightId,
					matchFlightId: flight.data()['id'],
					matchUserId : flight.data()['userId'],
					date: date,
					pfp: pfp,
					name: name,
					airport: airport
				});
			}

			resolve(results);
			
		} catch (error) {
		  	reject(error);
		}
	})
	
}

module.exports = {
	fetchMatches,
	findMatch
}