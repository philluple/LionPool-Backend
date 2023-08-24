const express = require('express');
const router = express.Router();
const axios = require('axios');
const { InstagramAuthCodeError, InstagramAuthTokenError} = require('./utils/error'); // Adjust the file path accordingly
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter, QueryDocumentSnapshot } = require('firebase-admin/firestore');
const serviceAccount = require('../lion-pool-f5755-firebase-adminsdk-zzm20-5b403629fd.json');
const admin = require('firebase-admin');
const db = getFirestore();


const clientID = '1326528034640707'; // Corrected typo
const clientSecret = '18099f125a22c5d417c2d92a2dcc935b';
const grantType = 'authorization_code';
const redirectUri = 'https://lion-pool.com/app/';

async function getAuthCode (userId, code) {
    return new Promise(async (resolve, reject) => {
        try {
            const requestData = {
				client_id: clientID,
				client_secret: clientSecret,
				grant_type: grantType,
				redirect_uri: redirectUri,
				code: code
			};
			
			const response = await axios.post(
				'https://api.instagram.com/oauth/access_token',
				new URLSearchParams(requestData).toString(),
				{
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					}
				}
			);

			if (response.data){
				const access_token = response.data["access_token"]
				console.log("Access token", access_token);
				const api_userId = response.data["user_id"]
				// Then we try to get the token
				try{
					const username = await getUserName(userId, access_token, api_userId)
					resolve(username)
				} catch(error){
					reject(error)
				}
			} else{
				throw new InstagramAuthCodeError();
			}
        } catch (error) {
            reject(error);
			console.log(error)
        }
    });
}

async function getUserName (userId, access_token, api_userId){
	return new Promise(async(resolve, reject) => {
		try {
			const url = `https://graph.instagram.com/${api_userId}?fields=id,username&access_token=${access_token}`;
			const response = await axios.get(url);

			if (!response.data.id || !response.data.username) {
				throw new InstagramAuthTokenError("Error getting short-lived auth token");
			}
			const instagram_id = response.data["id"];
			const username = response.data["username"];
			await getLongAuth(userId, access_token, api_userId, instagram_id, username);				
			resolve(username)
		} catch (error){
			reject(error)
		}
	});
}

async function getLongAuth(userId, access_token, api_userId, instagram_id, username){
	return new Promise(async(resolve, reject) => {
		try{
			const long_url = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${access_token}`;
			const long_response = await axios.get(long_url);
			if(!long_response.data.access_token || !long_response.data.expires_in){
				throw new InstagramAuthTokenError("Error getting long-lived auth token");
			}
			const long_access_token = long_response.data["access_token"];
			const expires_in_seconds = long_response.data["expires_in"];
			const expirationDate = calcExpirationDate(expires_in_seconds);
			console.log("Long access: ",long_access_token);
			const instagramData = {
				api_id: api_userId,
				instagram_id: instagram_id, 
				access_token: long_access_token,
				username: username,
				date: admin.firestore.Timestamp.fromDate(expirationDate)
			}

			db.collection('users').doc(userId).collection('instagram_api').doc('user_data').set(instagramData);
			resolve(null)
		} catch (error){
			reject(error)
		}
		
	})
}

function calcExpirationDate(expires_in_seconds) {
    const secondsInADay = 86400;
    const days = Math.floor(expires_in_seconds / secondsInADay);
    
    const currentDate = new Date();
    const expirationDate = new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000);

    console.log(expirationDate);
    return expirationDate;
}





module.exports = {
	getAuthCode,
};
