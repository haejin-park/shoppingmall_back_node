const User = require('../models/User');
const bcrypt = require('bcryptjs');

const userController = {};
userController.createUser = async(req, res) => {
    try {
        const {email, name, password, level} = req.body;
        const user = await User.findOne({email});
        if(user) throw new Error('User already exists.');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const newUser = await User.create({email, name, password:hash, level: level? level : "customer"});
        await newUser.save();
        res.status(200).json({status:'ok'});
    } catch(error) {
        res.send({status: 'fail', message: error.message});
    }
}

/*
회원가입
1. front에서 받은 정보를 req.body에서 꺼낸다.
2. db에 저장하기 전에 이미 존재하진 않는지 확인
3. 존재하면 에러
4. 미존재 하면 암호화 
5. 유저 생성(유저 정보, 암호화된 비밀번호 저장, 레벨은 선택값) -> 저장
6. res
7. try catch(error)
*/

module.exports = userController;

