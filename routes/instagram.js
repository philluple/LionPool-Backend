// const express = require('express');
// const router = express.Router();
const axios = require('axios');
const { InstagramAuthCodeError, InstagramAuthTokenError, InstagramFetchMediaError} = require('./utils/error'); // Adjust the file path accordingly
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter, QueryDocumentSnapshot } = require('firebase-admin/firestore');
const serviceAccount = require('../lion-pool-f5755-firebase-adminsdk-zzm20-5b403629fd.json');
const admin = require('firebase-admin');
const db = getFirestore();
const { LRUCache } = require('lru-cache')
const crypto = require('crypto')

const clientID = '1326528034640707'; // Corrected typo
const clientSecret = '18099f125a22c5d417c2d92a2dcc935b';
const grantType = 'authorization_code';
const redirectUri = 'https://lion-pool.com/app';

const data_option = {
    max: 50
}

const image_option = {
    max: 20,
	maxAge: 24 * 60 * 60 * 1000
}

const feed_cache = new LRUCache(image_option)

function deriveKeyFromUserId(userId) {
    return crypto.pbkdf2Sync(userId, 'salt', 100000, 32, 'sha256');
}

function encryptData(data, derivedKey) {
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv('aes-256-cbc', derivedKey, iv);
	let encryptedData = cipher.update(data, 'utf8', 'hex');
	encryptedData += cipher.final('hex');
	return { iv: iv.toString('hex'), encryptedData };
}

function decryptData(encryptedData, iv, derivedKey) {
	const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, Buffer.from(iv, 'hex'));
	let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
	decryptedData += decipher.final('utf8');
	return decryptedData;
}

async function retrieveData(userId){
	const doc = await db.collection('users').doc(userId).collection('instagram_api').doc('user_data').get()
	if(!doc.exists) {
		console.log('No document found');
		return null
	} else{
		return doc.data();
	}
}

async function fetchFeed (userId){
	return new Promise(async (resolve, reject) => {
		try{
			const cachedFeed = feed_cache.get(userId)
			if (cachedFeed){
				resolve(cachedFeed)
			}else{
				const derivedKey = deriveKeyFromUserId(userId);
				const encryptedData = await retrieveData(userId);
				if (encryptData) {
					const access_token = decryptData(encryptedData.access_token.encryptedData, encryptedData.access_token.iv, derivedKey);
					const post = await getMedia(access_token);
					feed_cache.set(userId, post);
							const cachedImage = imageCache.get(userId)
					resolve(post)
				} else {
					reject(null)
				}
			}
		} catch(error){
			console.log(error);
			reject(error);
		}
	});
}
// Should return JSON with username and top 6 posts
async function instagramSetup (userId, code){
    return new Promise(async (resolve, reject) => {
        try{
            const shortAuth_result  = await getShortAuth(code);
            // Instagram API generated userID 
            const api_userID = shortAuth_result["api_userId"];
            const short_access_token = shortAuth_result["short_access_token"];

            const userName_result = await getUserName(short_access_token, api_userID);
            //Instagram @ and the user id 
            const instagram_handle = userName_result["username"];
            const instagram_userId = userName_result["instagram_userId"]

            const longAuth_result = await getLongAuth(short_access_token)
            const access_token = longAuth_result["access_token"]
            const expiration = longAuth_result["expiration"]

            const posts = await getMedia(access_token)
			const derivedKey = deriveKeyFromUserId(userId);
			const encryptedToken = encryptData(access_token, derivedKey);

            const data = {
                api_id: api_userID,
                instagram_id: instagram_userId, 
                access_token: encryptedToken,
                username: instagram_handle,
                date: expiration
            }
            // No need to wait for this
            uploadtToDatabase(userId, data);
            resolve({username: instagram_handle, feed: posts})
        }
        //Might need to differentiate the errors later
        catch(error){
            reject(error)
        }
    });
}

async function getShortAuth (code) {
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

                resolve({short_access_token: access_token, api_userId: api_userId})
            } else{
                throw new InstagramAuthCodeError();
            }
        } catch (error) {
            reject(error);
            console.log(error)
        }
    });
}

async function getUserName (access_token, api_userId){
    return new Promise(async(resolve, reject) => {
        try {
            const url = `https://graph.instagram.com/${api_userId}?fields=id,username&access_token=${access_token}`;
            const response = await axios.get(url);

            if (!response.data.id || !response.data.username) {
                throw new InstagramAuthTokenError("Error getting short-lived auth token");
            }
            const instagram_id = response.data["id"];
            const username = response.data["username"];

            const data = {
                instagram_userId: response.data["id"],
                username: response.data["username"]
            }

            resolve({instagram_userId: response.data["id"], username: response.data["username"]});
        } catch (error){
            reject(error)
        }
    });
}

async function getLongAuth(access_token){
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
            // user_data_cache.set(userId, long_access_token);
			console.log("Finished long auth")
            resolve({access_token: long_access_token, expiration: admin.firestore.Timestamp.fromDate(expirationDate)});
        } catch (error){
            reject(error)
        }
        
    })
}

async function getMedia (access_token){
    return new Promise(async(resolve, reject) => {
        try{
            // First, try to derive the token 
            const url = `https://graph.instagram.com/me/media?fields=id,timestamp&access_token=${access_token}`
            const response = await axios.get(url);
            if (!response.data.data) {
                throw new InstagramFetchMediaError();
            }
            const data = response.data["data"];
            const post = [];
            let i = 0;

            while(i<data.length){
                const item = data[i]["id"]
				const timestamp = data[i]["timestamp"]
                const result = await getImage(item, access_token);
                if (result == 0 && Object.keys(post).length<6){
                    i++;
                    continue;
                }else {
					post.push({ id: item, imageURL: result, time: timestamp });
                    if(Object.keys(post).length >= 6){
                        break;
                    }else{
                        i++;
                        continue;
                    }
                }
            }
            console.log("Good work Phillip")
            resolve(post)
        } catch (error){
            console.log(error)
            reject(error)
        }
    });
}

async function getImage (id, access_token){
    try{
        const url = `https://graph.instagram.com/${id}?fields=media_type,media_url,timestamp&access_token=${access_token}`;
        const response = await axios.get(url);

        if (response.data){
            if (!(response.data["media_type"] === 'IMAGE' || response.data["media_type"] === 'CAROUSEL_ALBUM')) {
                return 0
            }
            else {
                const media_url = response.data["media_url"];
				return media_url;
                // const media_response = await axios.get(media_url);
                // try{
                //     const content_type = media_response.headers['content-type']
                //     if (media_response.headers['content-type'].includes('image')){
                //         const data = Buffer.from(media_response.data, 'binary').toString('base64');
                //         return data;
                //     }
                // }catch(error){
                //     console.log("issue with inner try")
                //     return 0;
                // }
            }
        } else {
            return 0;
        }
    }catch(error){
        console.log(error)
        return 0;
    }
}


function uploadtToDatabase(userId, data){
    db.collection('users').doc(userId).collection('instagram_api').doc('user_data').set(data);
}

function calcExpirationDate(expires_in_seconds) {
    const days = Math.floor(expires_in_seconds / 86400);
    const currentDate = new Date();
    const expirationDate = new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000);
    return expirationDate;
}

module.exports = {
    instagramSetup,
	fetchFeed
};
