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
        if(!user) throw new Error('User does not exist.');
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) throw new Error('The password does not match.');
        const token = await user.generateToken();
        if(!token) throw new Error('Faild to generate token');
        res.status(200).json({status:'ok', user, token});
    } catch(error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
}

/*
로그인
1. front에서 받은 정보를 req.body에서 꺼낸다 
2. db에 존재 하는지 확인
3. 존재하지 않으면 에러
4. 존재하면 비밀번호 비교 
5. 비밀번호 일치하지 않으면 에러 
6. 비밀번호 존재하면 res 유저 정보 반환
7. try catch(error)
*/ 

authController.loginWithGoogle = async(req, res) => {
    try {
        const {googleToken} = req.body;
        const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
        const ticket = await googleClient.verifyIdToken({
            idToken:googleToken,
            audience: GOOGLE_CLIENT_ID
        });
        const {email, name} = ticket.getPayload();
        // console.log("email, name", email, name);
        let user = await User.findOne({email}, "-createdAt -updatedAt -__v");
       
        if(!user) {
            const randomPassword = "" + Math.floor(Math.random()*100000000);
            const salt = await bcrypt.genSalt(10);
            const newPassword = await bcrypt.hash(randomPassword, salt);
            user = await new User({email, password:newPassword, name});
            await user.save();
        }
        // console.log("user",user);
        const token = await user.generateToken();
        // console.log("token",token);
        if(!token) throw new Error('Faild to generate token');
        res.status(200).json({status:'ok', user, token});
    } catch(error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
}

/*
백엔드 로그인(토큰 정보로 백엔드에서 로그인해서 유저정보email 받아올 수 있음(google-auth-library))
    1. 이미 로그인을 한 적이 있는 유저 ⇒ 로그인 시키고 토큰값 주면됨
    2. 처음 로그인 시도를 한 유저 ⇒ 유저 정보 먼저 새로 생성(유저정보를DB에 저장. password는 랜덤한 값 암호화해서 넣어주기) ⇒ user, 토큰 값
*/

authController.authenticate = async(req, res, next) => {
    try {
        const tokenString = req.headers.authorization;
        if(!tokenString) throw new Error('The token could not be found.');
        const token = tokenString.replace('Bearer ','');
        jwt.verify(token, JWT_SECRET_KEY, (error, payload) => {
            if(error) throw new Error('The token is invalid.');
            req.userId = payload._id;
        });
        next();
    } catch(error) {
        res.status(400).json({status:'fail', message:error.message});
    }
};

/*
내 정보 조회시 필요한 미들웨어(userId)
1. front에서 받은 정보를 req.headers에서 token을 꺼낸다
2. 토큰 스트링이 없으면 에러
3. 토큰 스트링이 있으면 'Bearer '을 ''로 변경하여 저장
4. 저장된 토큰이 유효한지 확인해본다 jwt.verify(token, 비밀키, )
5. 유효한 토큰이 아니면 에러처리
6. 유효한 토큰이면 페이로드에서 아이디 가져와서 req.userId에
7. next
8. try catch(error)
*/

authController.checkAdminPermission = async (req,res,next) => {
    try {
        const {userId} = req;
        const user = await User.findById(userId);
        if(user.level !== 'admin') throw new Error('You cannot use this feature. Because you do not have administrator privileges.');
        next();
    } catch(error) {
        res.status(400).json({status:'fail', message:error.message});
    }
}

/* 
admin여부 확인시 필요한 미들웨어(level)
userId로 user정보 가져와서 level에 따른 처리
*/
module.exports = authController;