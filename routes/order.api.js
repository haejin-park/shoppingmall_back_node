const express = require('express');
const authController = require('../controllers/auth.controller');
const orderController = require('../controllers/order.controller');
const cartController = require('../controllers/cart.controller');
const router = express.Router();

router.post('/', authController.authenticate, orderController.createOrder, cartController.deleteOrderItems);
router.get('/', authController.authenticate, orderController.getOrderList);
router.get('/:id', authController.authenticate, orderController.getOrderDetail);
router.put('/:id', authController.authenticate, orderController.updateOrder);

module.exports = router;