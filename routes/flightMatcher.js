// const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
// const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');
const {Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

const {isoToCustomFormat, timestampToISO} = require('./utils/timeUtils')
// const serviceAccount = require('../lion-pool-f5755-firebase-adminsdk-zzm20-5b403629fd.json');
const {noFlightError} = require('./utils/error'); 


const moment = require('moment');
const db = getFirestore();


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
					console.log("Could not find "+userId+" matches for flight on: "+requesterFlightDate.toDate());
					resolve(results);
				} 
				//Case: Other flights within range
				else{
					const res = await flightRef.update({foundMatch:true})
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
					userId: flight.data()['userId'],
					id: flight.data()['id'],
					pfp: pfp,
					date: date,
					name: name
				});
			}

			if(results.length == 0){
				console.log("There are no matches, prompt the user to wait")
			}else{
				//call the function below 
				console.log("Done! Found the user "+results.length+" matches!");
				const writeResult = await writeMatches(results, airport, userId, requesterFlightDate, flightId);
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
			console.log("DATE: ",isoToCustomFormat(match.date));
			const newDocument = isoToCustomFormat(requesterFlightDate)+"-"+userId;
			const res = await db.collection('users').doc(match.userId).collection('userFlights').doc(match.id).collection('matches').doc(newDocument).set(addedFlight);
		}
	
		//now add each match the requestedUsers own instances
		for(const match of potentialMatches){
			const newDocument = isoToCustomFormat(match.date)+"-"+match.userId;
			const res = await db.collection('users').doc(userId).collection('userFlights').doc(flightId).collection('matches').doc(newDocument).set(match);
		}
	}catch (error){
		console.error("ERROR: "+error);
	}
	//go to each match and add the requestedUser
	
}

module.exports = getMatches;
  
  
