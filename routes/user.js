const axios = require('axios');
const { InstagramAuthCodeError, InstagramAuthTokenError, InstagramFetchMediaError} = require('./utils/error'); // Adjust the file path accordingly
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter, QueryDocumentSnapshot } = require('firebase-admin/firestore');
const serviceAccount = require('../lion-pool-f5755-firebase-adminsdk-zzm20-5b403629fd.json');
const admin = require('firebase-admin');


async function createUser (email, password) {
    return new Promise(async (resolve, reject) => {
        try {
			const response = admin.auth().createUser({
				email: email,
				password: password
			})
			return 1;
			console.log(response)
        } catch (error) {
            reject(error);
            console.log(error)
			return 1;
        }
    });
}

module.exports = {
    createUser
};

