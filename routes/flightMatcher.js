const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');
const {isoToCustomFormat, timestampToISO} = require('./utils/timeUtils')
const serviceAccount = require('../lion-pool-f5755-firebase-adminsdk-zzm20-5b403629fd.json');
const {noFlightError} = require('./utils/error'); // Adjust the file path accordingly

initializeApp({
  credential: cert(serviceAccount)
});

const moment = require('moment');
const db = getFirestore();


async function getMatches(document_id, airport, requesterId){
	return new Promise(async(resolve, reject) => {
		console.log("\nFinding matches for "+requesterId+"\n");
		console.log("1: "+document_id+" 2: "+airport+" 3: "+requesterId)
		const flightRef = db.collection('flights').doc(airport).collection('userFlights').doc(document_id);
		const airportRef = db.collection('flights').doc(airport).collection('userFlights');
		const flightsToReturn = [];
		const results = [];
		var requesterFlightDate; 
	
		try {
			//Make sure that the flight is added
			const addedFlight = await flightRef.get();
	  
			//ensures that the flight the user is requesting matches for exists in db
			if (addedFlight.exists) {
				const timeWindowInMilliseconds = 3 * 60 * 60 * 1000; // 3 hours
				requesterFlightDate = addedFlight.data()['date'];
				const thisUser = addedFlight.data()['userId']
				const startTime = new Date(requesterFlightDate.toDate().getTime() - timeWindowInMilliseconds);
				const endTime = new Date(requesterFlightDate.toDate().getTime() + timeWindowInMilliseconds);
				
				//Query for finding matches 
				const snapshot = await airportRef
					.where('date', '>=', startTime)
					.where('date', '<=', endTime)
					.get();
				
				if (snapshot.length==1){
					console.log("Could not find "+requesterId+" matches for flight on: "+requesterFlightDate.toDate());
					resolve(results);
				} 
				else{
					const res = await flightRef.update({foundMatch:true})
					snapshot.forEach((doc)=>{
						if (doc.data()['userId']!= requesterId){
							console.log("Found match with user: ", doc.data()['userId'])
							flightsToReturn.push(doc);
						}
					});
				}
			} else {
				throw new noFlightError();
			}
	
			for(const flight of flightsToReturn){
				const request = await db.collection('users').doc(flight.data()['userId']).get();
				const date = timestampToISO(flight.data()['date']); // Convert Firestore Timestamp to ISO8601 string
				const name = request.data()['firstname']+" "+request.data()['lastname']
				const pfp = request.data()['pfpLocation'];		
		
				results.push({
					userId: flight.data()['userId'],
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
				const writeResult = await writeMatches(results, airport, requesterId, requesterFlightDate);
			}
			resolve(results);
			
		} catch (error) {
		  	reject(error);
		}
	})
	
}

async function writeMatches(potentialMatches, airport, requesterId, requesterFlightDate){
	const currentUser = await db.collection('users').doc(requesterId).get();
	var name = currentUser.data()['firstname']+" "+currentUser.data()['lastname']
	const currentUserImage = currentUser.data()['pfpLocation']
	
	//what is added to the current user
	const addedFlight = {
		userId: requesterId, 
		pfp: currentUserImage, 
		date: requesterFlightDate,
		name: name
	};

	//go to each match and add the requestedUser
	for(const match of potentialMatches){
		console.log("DATE: ",isoToCustomFormat(match.date))
		const outerDocName = isoToCustomFormat(match.date)+"-"+airport;
		const newDocument = isoToCustomFormat(requesterFlightDate)+"-"+requesterId;
		const res = await db.collection('users').doc(match.userId).collection('userFlights').doc(outerDocName).collection('matches').doc(newDocument).set(addedFlight);
	}

	//now add each match the requestedUsers own instances
	for(const match of potentialMatches){
		const outerDocName = isoToCustomFormat(requesterFlightDate)+"-"+airport;
		const newDocument = isoToCustomFormat(match.date)+"-"+match.userId;
		const res = await db.collection('users').doc(requesterId).collection('userFlights').doc(outerDocName).collection('matches').doc(newDocument).set(match);
	}
}

module.exports = getMatches;
  
  
