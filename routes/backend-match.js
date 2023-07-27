const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

const serviceAccount = require('../lion-pool-f5755-firebase-adminsdk-zzm20-5b403629fd.json');
initializeApp({
  credential: cert(serviceAccount)
});
const moment = require('moment');

const db = getFirestore();


async function getMatches(document_id, airport, requesterId){

	console.log("\nFinding matches for "+requesterId+"\n");
	const flightRef = db.collection('flights').doc(airport).collection('userFlights').doc(document_id);
	const airportRef = db.collection('flights').doc(airport).collection('userFlights');
	const flightsToReturn = [];
	const results = [];
	var requesterFlightDate; 
	

	try {
		const addedFlight = await flightRef.get();
  
		//ensures that the flight the user is requesting matches for exists in db
	  	if (addedFlight.exists) {
			const timeWindowInMilliseconds = 3 * 60 * 60 * 1000; // 3 hours
			requesterFlightDate = addedFlight.data()['date'];
			//this user refers to the user that has requested the match 
			const thisUser = addedFlight.data()['userId']
			const startTime = new Date(requesterFlightDate.toDate().getTime() - timeWindowInMilliseconds);
			const endTime = new Date(requesterFlightDate.toDate().getTime() + timeWindowInMilliseconds);
			
			const snapshot = await airportRef
        		.where('date', '>=', startTime)
				.where('date', '<=', endTime)
        		.get();
			
			if (snapshot.length==1){
				console.log("Could not find "+requesterId+" matches for flight on: "+requesterFlightDate.toDate());
			} 
			else{
				//update the boolean in the flight struct stored in firestore 
				const res = await flightRef.update({foundMatch:true})
				snapshot.forEach((doc)=>{
					if (doc.data()['userId']!= requesterId){
						console.log("Found match with user: ", doc.data()['userId'])
						flightsToReturn.push(doc);
					}
				});
			}
		} else {
			console.log('Error with adding flight!');
		}

				// console.log("Raw date: ", flight.data()['date'].toDate())	
			//const date = flight.data()['date'].toDate();

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
			console.log("Done! Found the user "+results.length+" matches!")
			const writeResult = await writeMatches(results, airport, requesterId, requesterFlightDate);
		}
		return results
		
	} catch (error) {
	  console.error('Error fetching document:', error);
	}
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
	}

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

function formatDate(date){
	const dateObject = date.toDate();
	const year = dateObject.getFullYear();
	const month = String(dateObject.getMonth() + 1).padStart(2, '0');
	const day = String(dateObject.getDate()).padStart(2, '0');
	const hours = String(dateObject.getHours()).padStart(2, '0');
	const minutes = String(dateObject.getMinutes()).padStart(2, '0');
	const seconds = String(dateObject.getSeconds()).padStart(2, '0');
	const formattedDate = `${year}${month}${day}${hours}${minutes}${seconds}`;
	return formattedDate
}

function isoToCustomFormat(isoDate){
	const dateObject = moment(isoDate);
	if (dateObject.isValid()){
		return dateObject.format('YYYYMMDDHHmmss');
	}else{
		return nil;
	}
}


function timestampToISO(timestamp) {
	return timestamp.toDate().toISOString();
}
  
  module.exports = getMatches;
  
  
