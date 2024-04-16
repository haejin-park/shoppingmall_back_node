const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const hpp = require('hpp');
require("dotenv").config();
const indexRouter = require('./routes/index');
const express = require('express');
const app = express();
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json())

if(process.env.NODE_ENV === 'production'){
    app.use(morgan('combined'));
    app.use(hpp());
} else {
    app.use(morgan('dev'));
}

app.use(cors());
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