const express = require('express');
const authController = require('../controllers/auth.controller');
const orderController = require('../controllers/order.controller');
const cartController = require('../controllers/cart.controller');

const router = express.Router();

router.post('/', authController.authenticate, orderController.createOrder, cartController.deleteOrderProduct);

module.exports = router;