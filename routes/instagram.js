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
				const api_userId = response.data["user_id"]
				// Then we try to get the token
				try{
					const username = await getAuthToken(userId, access_token, api_userId)
					resolve(username)
				} catch(error){
					reject(error)
				}
			} else{
				throw new InstagramAuthCodeError();
			}
        } catch (error) {
            reject(error);
        }
    });
}

async function getAuthToken (userId, access_token, api_userId){
	return new Promise(async(resolve, reject) => {
		try {
			const url = `https://graph.instagram.com/${api_userId}?fields=id,username&access_token=${access_token}`;
			const response = await axios.get(url)
				.then(response => {
					if (!response.data.id || !response.data.username) {
						throw new InstagramAuthTokenError;
					}
					const instagram_id = response.data["id"]
					const username = response.data["username"]
					const instagramData = {
						api_id: api_userId,
						instagram_id: instagram_id, 
						access_token: access_token,
						username: username,
						date: admin.firestore.Timestamp.fromDate(new Date())
					}
					await db.collection('users').doc(userId).collection('instagram_api').doc('user_data').set(instagramData);
					resolve(username)
				})
		} catch (error){
			console.log(error)
			reject(error)
		}
	})
}



module.exports = {
	getAuthCode,
	getAuthToken
};
