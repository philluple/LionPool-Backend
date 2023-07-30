const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');
const { databaseError, flightExistsError, writeMatchesError, noFlightError} = require('./utils/error'); // Adjust the file path accordingly
const {isoToCustomFormat, timestampToISO} = require('./utils/timeUtils');
const { v1: uuidv1, v4: uuidv4,} = require('uuid');
const moment = require('moment');
const serviceAccount = require('../lion-pool-f5755-firebase-adminsdk-zzm20-5b403629fd.json');

const db = getFirestore();

async function fetchRequests(userId){
	return new Promise(async(resolve, reject) => {
		const requests = []
		try{
			const userRequests = await db.collection('users').doc(userId).collection('outRequests').get()
			if (userRequests.empty){
				resolve(requests)
			} else{
				userRequests.forEach (request => {
					requests.push({
						id: request.data()['id'], 
						senderFlightId: request.data()['senderFlightId'],
						recieverFlightId: request.data()['recieverFlightId'],
						recieverUserId: request.data()['recieverUserId'], 
						requestDate: timestampToISO(request.data()['requestDate']),
						flightDate: timestampToISO(request.data()['flightDate']),
						name: request.data()['name'], 
						pfp: request.data()['pfpLocation'],
						status: request.data()['status'],
						airport: request.data()['airport']
					});
				});
				resolve(requests);
			}
		}catch(error){
			reject(error)
		}
	});
}

async function fetchFlights(userId){
	return new Promise(async(resolve, reject) => {
		const flights = []
		try{
			const userFlights = await db.collection('users').doc(userId).collection('userFlights').get();
			if (userFlights.empty) {
				resolve(flights) 
			} else{
				userFlights.forEach	(flight => {
					flights.push({
						id: flight.data()['id'],
						userId: flight.data()['userId'],
						airport: flight.data()['airport'],
						date: timestampToISO(flight.data()['date']),
						foundMatch: flight.data()['foundMatch']
					});
				});
				resolve(flights);
		}
		}catch(error){
			reject(error)
		}
	});
}

async function addFlight(userId, date, airport){
	return new Promise(async(resolve, reject) => {
		const formattedDate = new Date(date);
		const startOfDay = new Date(date);
		startOfDay.setHours(0,0,0,0);
		const endOfDay = new Date(date);
		endOfDay.setHours(23,59,59,999);

		// Range
		const start = Timestamp.fromDate(startOfDay)
		const end =Timestamp.fromDate(endOfDay)

		const checkExistingQuery =  db.collection('users')
										.doc(userId)
										.collection('userFlights')
										.where("date", ">=",start)
										.where("date", "<=", end);
		
	
		try {
			//Runs the query to ensure there is not already a flight there
			let checkExistSnapshot = await checkExistingQuery.get();

			// TODO: Existing flight already, make custom error 
			if (!checkExistSnapshot.empty){
				throw new flightExistsError();
			} else {
				// Generate an Id for this flight 
				const flightId = uuidv1();

				// Storing data in user collection 
				const flightDataForUser = {
					id: flightId,
					userId: userId,
					airport: airport,
					date: formattedDate,
					foundMatch: false
				};
				await db.collection('users')
									.doc(userId)
									.collection('userFlights')
									.doc(flightId)
									.set(flightDataForUser);

				// Storing data in flight collection
				const flightDataForAirport = {
					id: flightId,
					userId: userId,
					date: formattedDate, 
					foundMatch: false
				};

				const document_name = `${flightId}-${userId}`
				await db.collection('flights')
							.doc(airport)
							.collection('userFlights')
							.doc(document_name)
							.set(flightDataForAirport);

				resolve(flightDataForUser)
			}
		} catch (error) {
			if (error instanceof flightExistsError){
				reject(error)
			} else {
				reject(new databaseError());
			}
		}
	})
}

async function deleteFlight (flightId, userId, airport){
	return new Promise(async(resolve, reject) => {
		const document_name = `${flightId}-${userId}`

		try{
			await db.collection('users')
				.doc(userId)
				.collection('userFlights')
				.doc(flightId)
				.delete();

			await db.collection('flights')
				.doc(airport)
				.collection('userFlights')
				.doc(document_name)
				.delete();
			
				resolve(null);
		}catch(error){
			reject(error);
		}
	});
}

module.exports = {
	addFlight, 
	deleteFlight,
	fetchFlights,
	fetchRequests
};
  
  
