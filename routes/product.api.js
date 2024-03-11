const express = require('express');
const authController = require('../controllers/auth.controller');
const productController = require('../controllers/product.controller');
const router = express.Router();

router.post('/',authController.authenticate, authController.checkAdminPermission, productController.createProduct);
router.get('/', productController.getProducts);

module.exports = router;