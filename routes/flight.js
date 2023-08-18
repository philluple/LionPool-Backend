const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter, QueryDocumentSnapshot } = require('firebase-admin/firestore');
const { databaseError, flightExistsError, writeMatchesError, noFlightError} = require('./utils/error'); // Adjust the file path accordingly
const { v1: uuidv1} = require('uuid');
const serviceAccount = require('../lion-pool-f5755-firebase-adminsdk-zzm20-5b403629fd.json');
const admin = require('firebase-admin');
const { request } = require('express');
const db = getFirestore();

async function fetchFlights(userId) {
    return new Promise(async (resolve, reject) => {
        try {
            const userFlights = await db.collection('users').doc(userId).collection('userFlights').get();
            const flights = [];

            userFlights.forEach(flight => {
                flights.push({
                    id: flight.data()['id'],
                    userId: flight.data()['userId'],
                    airport: flight.data()['airport'],
                    date: flight.data()['date'].toDate().toISOString(),
                    foundMatch: flight.data()['foundMatch']
                });
            });
			flights.sort(compareDate)
			console.log(flights)
            resolve(flights);
        } catch (error) {
            reject(error);
        }
    });
}

function compareDate(flight_a, flight_b){
	const flight_a_date = new Date(flight_a['date']);
	const flight_b_date = new Date(flight_b['date']);
	if (flight_a_date < flight_b_date){
		return -1;
	} else if (flight_a_date > flight_b_date){
		return 1;
	}
	return 0
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
			await cleanUpFromDelete(flightId, userId, airport);

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

async function cleanUpFromDelete (flightId, userId, airport){
	const outRequestsQuery = db.collection('users')
								.doc(userId)
								.collection('outRequests')

	var recieverUserIdFromOut;
	var requestIDFromOut;
	var senderUserId;
	var requestId;

	//This works
	const outRequestsSnapshot = await outRequestsQuery.where('senderFlightId', '==', flightId).get()
	
	if (!outRequestsSnapshot.empty){
		outRequestsSnapshot.forEach(doc => {
			recieverUserIdFromOut = doc.data()['recieverUserId'];
			requestIDFromOut = doc.data()['id'];
			doc.ref.delete();
		});

		const inRequestsQuery = await db.collection('users')
								.doc(recieverUserIdFromOut)
								.collection('inRequests')
								.doc(requestIDFromOut).get();

		if (!inRequestsQuery.empty){
			inRequestsQuery.forEach(doc => {
				doc.ref.delete()
		})
	}
	}
}

module.exports = {
	fetchFlights,
	addFlight,
	deleteFlight,
}