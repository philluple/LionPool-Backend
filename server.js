//server
const express = require('express')
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express()
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const matchesRouter = require('./routes/matches');
app.use('/api', matchesRouter);

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});