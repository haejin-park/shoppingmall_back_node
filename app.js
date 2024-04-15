const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require("dotenv").config();
const indexRouter = require('./routes/index');

const app = express();

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json())
const frontURL = process.env.NODE_ENV === 'production' 
? `${process.env.FRONT_PROD_URL}` : `${process.env.FRONT_DEV_URL}`;
app.use(cors({
    origin: frontURL,
    credentials: true,
}));
app.use('/api',indexRouter);

const mongoURI =  process.env.NODE_ENV === 'production' 
? process.env.MONGODB_PROD_URI
: process.env.MONGODB_DEV_URI;
mongoose
    .connect(mongoURI)
    .then(() => console.log("mongoose connected"))
    .catch((error) => console.error(error));

app.listen(process.env.PORT || 5001, () => {
    console.log("server on");
});