const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');
const { databaseError, flightExistsError, writeMatchesError, noFlightError} = require('./utils/error'); // Adjust the file path accordingly
const {isoToCustomFormat, timestampToISO} = require('./utils/timeUtils');
const { v1: uuidv1, v4: uuidv4,} = require('uuid');
const moment = require('moment');
const serviceAccount = require('../lion-pool-f5755-firebase-adminsdk-zzm20-5b403629fd.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function addFlight(userId, date, airport){
	return new Promise(async(resolve, reject) => {
		console.log("DEBUG: Attempting to add flight for user", userId)		
		const dateRange = {
			startDate: moment(date).startOf('day').toDate(),
			endDate: moment(date).add(1, 'day').toDate()
		};

		const checkExistingQuery = await db.collection('users')
										.doc(userId)
										.collection('userFlights')
										.whereField("date", isGreaterThanOrEqualTo, dateRange['startDate'])
										.whereField("date", isGreaterThanOrEqualTo, dateRange['endDate'])
		
	
		try {
			//Runs the query to ensure there is not already a flight there
			let checkExistSnapshot = checkExistingQuery.getDocuments();

			// TODO: Existing flight already, make custom error 
			if (!checkExistSnapshot.empty){
				throw new flightExistsError();
			} else {
				// Generate an Id for this flight 
				const flightId = uuidv1();

				// Storing data in user collection 
				const flightDataForUser = {
					flightId: flightId,
					userId: userId,
					airport: airport,
					date: date,
					foundMatch: false
				};
				await db.collection('users')
									.doc(userId)
									.collection('userFlights')
									.doc(flightId)
									.set(flightDataForUser);

				// Storing data in flight collection
				const flightDataForAirport = {
					flightId: flightId,
					userId: userId,
					date: date, 
					foundMatch: false
				};

				await db.collection('flights')
							.doc(airport)
							.collection('userFlights')
							.doc(flightId+userId)
							.set(flightDataForAirport);
				resolve("User: \(userId) added a flight successfully!")
			}
		} catch (error) {
			if (error instanceof flightExistsError){
				// console.error(error.message);
				reject(error)
			} else {
				// console.error("Could not add user flight", error)
				reject(new databaseError());
			}
		}
	})
}

async function deleteFlight (flightId, userId, airport){
	return new Promise(async(resolve, reject) => {
		console.log("User: "+userId+" attempting to delete flight: "+flightId);
		try{

			await db.collection('flights')
						.doc(airport)
						.collection('userFlights')
						.doc(flightId+userId)
						.delete();
			
			await db.collection('flights')
				.doc(airport)
				.collection('userFlights')
				.doc(flightId+userId)
				.delete();

			resolve("Flight: "+flightId+" from user: "+userId+" deleted successfully!");
			
		}catch(error){
			reject(error);
		}
	});
}

module.exports = {
	addFlight, 
	deleteFlight
};
  
  
