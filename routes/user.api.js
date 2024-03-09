const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authController = require("../controllers/auth.controller");

// 회원가입
router.post('/',userController.createUser);
// 토큰 사용 가능 여부 확인 후 req.userId -> 내 정보 조회
router.get('/me', authController.authenticate, userController.getUser);

module.exports = router;