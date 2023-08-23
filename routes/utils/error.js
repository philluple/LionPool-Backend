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

class InstagramAuthCodeError extends Error{
	constructor(message){
		super(message || "There was a problem with getting authorization code")
		this.name = 'InstagramAuthCodeError'
	}
}

class InstagramAuthTokenError extends Error{
	constructor(message){
		super(message || "There was a problem with getting the authorization token")
		this.name = 'InstagramAuthTokenError'
	}
}

module.exports = {
	databaseError,
	flightExistsError,
	writeMatchesError,
	noFlightError,
	InstagramAuthCodeError,
	InstagramAuthTokenError
};
  