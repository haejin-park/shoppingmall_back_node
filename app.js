const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const hpp = require('hpp');
const helmet = require('helmet');
require("dotenv").config();
const indexRouter = require('./routes/index');

const app = express();

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json())
const frontURL = process.env.NODE_ENV === 'production' 
? `${process.env.FRONT_PROD_URL}` : `${process.env.FRONT_DEV_URL}`;

if(process.env.NODE_ENV === 'production'){
    app.use(morgan('combined'));
    app.use(hpp());
    app.use(helmet());
    app.use(cors({
        origin: frontURL,
        credentials: true,
    }));
} else {
    app.use(morgan('dev'));
    app.use(cors({
        origin: frontURL,
        credentials: true,
    }));
}


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