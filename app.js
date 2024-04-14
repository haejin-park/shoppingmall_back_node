const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require("dotenv").config();
const indexRouter = require('./routes/index');


const app = express();
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json())
app.use(cors());
app.use('/api',indexRouter);

const mongoURI = process.env.LOCAL_DB_ADDRESS;
mongoose
    .connect(mongoURI)
    .then(() => console.log("mongoose connected"))
    .catch((error) => console.error(error));

app.listen(process.env.PORT || 5001, () => {
    console.log("server on");
});