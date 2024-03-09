const User = require('../models/User');
const bcrypt = require('bcryptjs');
const authController = {};

authController.loginWithEmail = async(req, res) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email});
        if(!user) throw new Error('User does not exist.');
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) throw new Error('The password does not match.');
        const token = user.generateToken();
        res.status(200).json({status:'ok', user, token});
    } catch(error) {
        res.send({status: 'fail', message: error.message});
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

module.exports = authController;