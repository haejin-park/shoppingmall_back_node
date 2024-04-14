const User = require('../models/User');
const bcrypt = require('bcryptjs');
const {OAuth2Client} = require('google-auth-library');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const authController = {};

authController.loginWithEmail = async(req, res) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email}, "-createdAt -updatedAt -__v");
        if(!user) throw new Error('사용자가 존재하지 않습니다.');
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) throw new Error('비밀 번호가 일치하지 않습니다.');
        const token = await user.generateToken();
        if(!token) throw new Error('토큰 생성에 실패하였습니다.');
        res.status(200).json({status:'ok', user, token});
    } catch(error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
}

authController.loginWithGoogle = async(req, res) => {
    try {
        const {googleToken} = req.body;
        const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
        const ticket = await googleClient.verifyIdToken({
            idToken:googleToken,
            audience: GOOGLE_CLIENT_ID
        });
        const {email, name} = ticket.getPayload();
        let user = await User.findOne({email}, "-createdAt -updatedAt -__v");
       
        if(!user) {
            const randomPassword = "" + Math.floor(Math.random()*100000000);
            const salt = await bcrypt.genSalt(10);
            const newPassword = await bcrypt.hash(randomPassword, salt);
            user = await User.create({email, name, password:newPassword});
            await user.save();
        }
        const token = await user.generateToken();
        if(!token) throw new Error('토큰 생성에 실패하였습니다.');
        res.status(200).json({status:'ok', user, token});
    } catch(error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
}

authController.authenticate = async(req, res, next) => {
    try {
        const tokenString = req.headers.authorization;
        if(!tokenString) throw new Error('헤더에 저장된 토큰을 찾을 수 없습니다.');
        const token = tokenString.replace('Bearer ','');
        jwt.verify(token, JWT_SECRET_KEY, (error, payload) => {
            if(error) throw new Error('토큰이 유효하지 않습니다.');
            req.userId = payload._id;
        });
        next();
    } catch(error) {
        res.status(400).json({status:'fail', message:error.message});
    }
};

authController.checkAdminPermission = async (req,res,next) => {
    try {
        const {userId} = req;
        const user = await User.findById(userId);
        if(user.level !== 'admin') throw new Error('관리자 권한이 없어 해당 기능을 사용할 수 없습니다.');
        next();
    } catch(error) {
        res.status(400).json({status:'fail', message:error.message});
    }
}

module.exports = authController;