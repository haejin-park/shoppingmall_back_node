const User = require('../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const jwt  =  require ( 'jsonwebtoken' ) ; 
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const authController = {};

authController.loginWithEmail = async(req, res) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email}, "-createdAt -updatedAt -__v");
        if(!user) throw new Error('User does not exist.');
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) throw new Error('The password does not match.');
        const token = user.generateToken();
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
    const {userId} = req;
    const user = await User.findById(userId);
    req.level = user.level;
    next();
}

/* admin여부 확인시 필요한 미들웨어(level)
userId로 user정보 가져와서 level넘긴다
*/


module.exports = authController;