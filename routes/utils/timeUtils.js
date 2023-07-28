const moment = require('moment')

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

module.exports = {
	isoToCustomFormat,
	timestampToISO
}