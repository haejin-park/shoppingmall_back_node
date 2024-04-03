const User = require('../models/User');
const bcrypt = require('bcryptjs');

const userController = {};
userController.createUser = async(req, res) => {
    try {
        const {email, name, password} = req.body;
        const user = await User.findOne({email});
        if(user) throw new Error('이미 존재하는 사용자입니다.');
        const salt = await bcrypt.genSalt(10);
        const newPassword = await bcrypt.hash(password, salt);
        const newUser = await User.create({email, name, password:newPassword});
        await newUser.save();
        res.status(200).json({status:'ok'});
    } catch(error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
}

userController.getUser = async(req, res) => {
    try {
        const {userId} = req;
        const user = await User.findById(userId);
        if(!user) throw new Error('사용자가 존재하지 않습니다.');
        res.status(200).json({status:'ok', user});
    } catch(error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
}

module.exports = userController;

