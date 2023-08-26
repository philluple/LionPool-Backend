const express = require('express');
const router = express.Router();
const {getAuth, sendEma} = require ('firebase/auth')
const admin = require('firebase-admin');
const auth = getAuth();


router.post('/newUser', (req, res) => {
	const {email, password, firstName, lastName} = req.body;
	const id = createUser(email, password)
})