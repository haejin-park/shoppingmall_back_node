const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

const userSchema = Schema(
    {
        email: {type:String, required:true, unique:true},
        password: {type:String, required:true},
        name: {type:String, required:true},
        level:{type:String, defualt:"customer"} //2types: customer, admin
    }, 
    {timestamps:true}
);

userSchema.methods.toJSON = function() {
    const obj = this._doc
    delete obj.password
    delete obj.createdAt
    delete obj.updatedAt
    delete obj.__v //버전정보
    return obj
}

userSchema.methods.generateToken = function () {
    const token = jwt.sign({id:this._id}, JWT_SECRET_KEY, {expiresIn:'1d'});
    return token;
}

const User = mongoose.model("User", userSchema);
module.exports = User;