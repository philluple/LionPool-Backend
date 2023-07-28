class databaseError extends Error {
	constructor(message) {
	  super(message);
	  this.name = 'databaseError';
	}
}
  
class flightExistsError extends Error {
	constructor(message) {
		super(message || 'User tried to add multiple flights on date'); 
		this.name = 'flightExistsError';
	}
}

class writeMatchesError extends Error {
	constructor(message){
		super(message || 'Unable to write matches to Firestore');
		this.name = 'writeMatchesError';
	}
}

class noFlightError extends Error {
	constructor(message){
		super(message || 'Could not find flight in Firestore');
		this.name = 'noFlightError';
	}
}

module.exports = {
	databaseError,
	flightExistsError,
	writeMatchesError,
	noFlightError
};
  