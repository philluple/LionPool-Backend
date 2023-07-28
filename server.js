//server
const express = require('express')
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const serviceAccount = require('./lion-pool-f5755-firebase-adminsdk-zzm20-5b403629fd.json');


admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
	// Add any other configuration options here if needed
});

  
const app = express()
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const matchesRouter = require('./routes/matchRoutes');
const flightRouter = require('./routes/flightRoutes');

app.use('/api', matchesRouter);
app.use('/api', flightRouter);


app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
