const express = require('express')
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const serviceAccount = require('./lion-pool-f5755-firebase-adminsdk-zzm20-5b403629fd.json');


admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	storageBucket: 'lion-pool-f5755.appspot.com'
});

// cron.schedule("* */59 */11 * * *", function () {
// 	console.log("Hello")
// });

  
const app = express()
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const matchRouter = require('./routes/matchRoutes');
const flightRouter = require('./routes/flightRoutes');
const requestRouter = require('./routes/requestRoutes');
const imageRouter = require('./routes/loadImageRoute');
const instagramRouter = require('./routes/instagram');

app.use('/api', matchRouter);
app.use('/api', flightRouter);
app.use('/api', imageRouter);
app.use('/api', requestRouter);
app.use('/api', instagramRouter)


app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
