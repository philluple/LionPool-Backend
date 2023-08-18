const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const getStream = require('get-stream');
const { getStorage } = require('firebase/storage');

const { LRUCache } = require('lru-cache')
const options = {
	max: 10
}

const imageCache = new LRUCache(options)
// const imageCache = new LRUCache({max: 5});


router.get('/fetchImage', async (req, res) => {
	const userId = req.query.userId; // Replace this with your user ID
	try {
		const cachedImage = imageCache.get(userId)
		if (cachedImage){
			res.status(200).send(cachedImage);
		} else{
			const imageStream = await fetchImage(userId);
			const base64Image = await convertImageStreamToBase64(imageStream);
			imageCache.set(userId, base64Image);
			res.status(200).send(base64Image)
		}
	} catch (error) {
	  res.status(500).send('Error fetching image');
	}
});


async function fetchImage(userId) {
	const filePath = `profile-images/${userId}-pfp.jpg`;
	const file = admin.storage().bucket().file(filePath);
	return file.createReadStream();
}
  
  // Function to convert the image stream to base64 encoded string
async function convertImageStreamToBase64(imageStream) {
	try {
	  const buffer = await getStream.buffer(imageStream);
	  const base64Image = buffer.toString('base64');
	  return base64Image;
	} catch (error) {
	  console.error('Error converting image to base64:', error);
	  throw error;
	}
}

module.exports = router;
