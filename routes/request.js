const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter, QueryDocumentSnapshot } = require('firebase-admin/firestore');
const serviceAccount = require('../lion-pool-f5755-firebase-adminsdk-zzm20-5b403629fd.json');
const admin = require('firebase-admin');
const { v1: uuidv1} = require('uuid');
const { request } = require('express');

const db = getFirestore();

async function sendRequest(senderFlightId, senderUserId, recieverFlightId, recieverUserId){
	return new Promise(async(resolve, reject) => {

		console.log("Sending user request")
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
			const flightDate = flightDateStamp.toDate().toISOString();
			const airport = senderFlightQuery.data()['airport'];
			// const requestDate = Timestamp.now()

			const recieverData = {
				id: matchId, 
				senderFlightId: senderFlightId,
				recieverFlightId: recieverFlightId,
				name: senderName, 
				recieverUserId: recieverUserId, 
				senderUserId: senderUserId,
				// requestDate: requestDate,
				flightDate: flightDateStamp,
				pfpLocation: senderPfp,
				airport: airport, 
				status: "PENDING",
				notify: true
			};
			
			// const formattedDate = timestampToISO(requestDate);

			const senderData = {
				id: matchId, 
				senderFlightId: senderFlightId,
				recieverFlightId: recieverFlightId,
				name: recieverName, 
				recieverUserId: recieverUserId, 
				senderUserId: senderUserId,
				// requestDate: requestDate,
				flightDate: flightDateStamp,
				pfpLocation: recieverPfp,
				airport: airport, 
				status: "PENDING",
			};

			const senderDataToFront = {
				id: matchId, 
				senderFlightId: senderFlightId,
				recieverFlightId: recieverFlightId,
				recieverUserId: recieverUserId, 
				flightDate: flightDate,
				senderUserId: senderUserId,
				// requestDate: requestDate,
				pfp: recieverPfp,
				name: recieverName, 
				status: "PENDING",
				airport: airport,
			};

			await senderRef.set(senderData);
			await recieverRef.set(recieverData);
			resolve(senderDataToFront);

		}catch(error){
			reject(error)
		}
	});
}

async function updateNotify(flightId, userId){
	return new Promise(async(resolve, reject) => {
	try{
		const userRef = db.collection('users').doc(userId).collection('inRequests');
        const userRefSnapshot = await userRef.where("recieverFlightId", "==", flightId).get();

		if (!userRefSnapshot.empty) {
			userRefSnapshot.forEach(doc => {
				userRef.doc(doc.id).update({ notify: false }); // Update the document using its reference
			});
			resolve(null)
		} else {
			resolve(null)
		}
	}catch(error){
		reject(error);
	}
});
}

async function acceptRequest(requestId, recieverFlightId, recieverName, recieverUserId,
	recieverPfp, senderFlightId, senderName, senderUserId, senderPfp, date, airport){
	return new Promise(async(resolve, reject) => {
		try{
			//Ref's for where to write
			const senderRef = db.collection('users').doc(senderUserId).collection('matches').doc(requestId);
			const recieverRef = db.collection('users').doc(recieverUserId).collection('matches').doc(requestId);
			//Ref's for info
			const dateStamp = Timestamp.fromDate(new Date(date));

			const matchA = {
				id: requestId,
				matchFlightId: senderFlightId,
				flightId: recieverFlightId,
				matchUserId: senderUserId,
				date: dateStamp,
				pfp: senderPfp,
				name: senderName,
				airport: airport
			}

			const matchB = {
				id: requestId,
				matchFlightId: recieverFlightId,
				flightId: senderFlightId,
				matchUserId: recieverUserId,
				date: dateStamp,
				pfp: recieverPfp,
				name: recieverName,
				notify: true,
				airport: airport
			}

			await senderRef.set(matchB);
			await recieverRef.set(matchA);
			await db.collection('users').doc(senderUserId).collection('outRequests').doc(requestId).delete();
			await db.collection('users').doc(recieverUserId).collection('inRequests').doc(requestId).delete();
			changeFlightStatus(recieverFlightId, recieverUserId, senderFlightId, senderUserId);
			resolve(null);
		}catch(error){
			reject(error);
		}
	});
}


async function changeFlightStatus (recieverFlightId, recieverUserId, senderFlightId, senderUserId){
	try{
		await db.collection('users').doc(recieverUserId).collection('userFlights').doc(recieverFlightId).update({foundMatch: true})
		await db.collection('users').doc(senderUserId).collection('userFlights').doc(senderFlightId).update({foundMatch: true})
		console.log("Updated user flights for "+recieverUserId+" and "+senderUserId);
		return
	}catch(error){
		console.error("Error updating flight status, ",error);
	}
}


async function rejectRequest(requestId, recieverUserId, senderUserId){
	return new Promise(async(resolve, reject) => {
		try{
			const senderRef = db.collection('users').doc(senderUserId).collection('outRequests').doc(requestId);
			const recieverRef = db.collection('users').doc(recieverUserId).collection('inRequests').doc(requestId);
			await senderRef.update({status:'REJECTED'});
			await senderRef.update({notify: true});
			await recieverRef.delete();
			resolve(null)
		}catch(error){
			reject(error);
		}
	});
}


async function fetchInRequests(userId){
	return new Promise(async(resolve, reject) => {
		const requests = []
		try{
			const userRequests = await db.collection('users').doc(userId).collection('inRequests').get()
			if (userRequests.empty){
				resolve(requests)
			} else{
				userRequests.forEach (request => {
					requests.push({
						id: request.data()['id'], 
						senderFlightId: request.data()['senderFlightId'],
						recieverFlightId: request.data()['recieverFlightId'],
						recieverUserId: request.data()['recieverUserId'],
						senderUserId: request.data()['senderUserId'],
						// requestDate: ((request.data()['requestDate']).toDate()).toISOString(),
						flightDate: (request.data()['flightDate']).toDate().toISOString(),
						name: request.data()['name'], 
						pfp: request.data()['pfpLocation'],
						status: request.data()['status'],
						airport: request.data()['airport'],
						notify: request.data()['notify']
					});
				});
				resolve(requests);
			}
		}catch(error){
			reject(error);
		}
	});
}

async function fetchOutRequests(userId){
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
						senderUserId: request.data()['recieverUserId'],
						flightDate: (request.data()['flightDate']).toDate().toISOString(),
						name: request.data()['name'], 
						pfp: request.data()['pfpLocation'],
						status: request.data()['status'],
						airport: request.data()['airport'],
						notify: request.data()['notify']
					});
				});
				resolve(requests);
			}
		}catch(error){
			reject(error)
		}
	});
}

module.exports = {
	sendRequest,
	acceptRequest,
	rejectRequest,
	fetchInRequests,
	fetchOutRequests,
	updateNotify
}