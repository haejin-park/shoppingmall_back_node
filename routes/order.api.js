const express = require('express');
const authController = require('../controllers/auth.controller');
const orderController = require('../controllers/order.controller');
const cartController = require('../controllers/cart.controller');
const router = express.Router();

router.post('/', authController.authenticate, orderController.createOrder, cartController.deleteOrderItems);
router.get('/my', authController.authenticate, orderController.getMyOrderList);
router.get('/admin', authController.authenticate, orderController.getAdminOrderList);
router.get('/:id', authController.authenticate, orderController.getOrderDetail);

module.exports = router;