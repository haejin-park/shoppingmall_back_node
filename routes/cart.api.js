const express = require('express');
const authController = require('../controllers/auth.controller');
const cartController = require('../controllers/cart.controller');
const router = express.Router();

router.post('/', authController.authenticate, cartController.addCartItem);
router.get('/', authController.authenticate, cartController.getCartList);
router.get('/qty', authController.authenticate, cartController.getCartItemCount);
router.delete('/delete/:id', authController.authenticate, cartController.deleteCartItem)
router.put('/', authController.authenticate, cartController.updateCartItemQty);
module.exports = router;