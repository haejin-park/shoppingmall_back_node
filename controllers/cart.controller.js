const Cart = require("../models/Cart");
const cartController = {};
cartController.addItemToCart = async(req, res) => {
    try {
        const { userId } = req;
        const { productId, size, qty } = req.body;

        let cart = await Cart.findOne({userId});
        
        if(!cart) cart = new Cart({userId});
        console.log("cart.items", cart.items);

        const existItemIndex = cart.items.findIndex(item =>
            item.productId.toString() === productId &&
            item.size === size
        )
        console.log('existItemIndex',existItemIndex);

        let message = '';
        if(existItemIndex === -1) {
            console.log("진입");
            cart.items = [...cart.items, {productId, size, qty}];
            message = "장바구니에 해당 상품을 추가했습니다.";
        } else {
            cart.items[existItemIndex].qty += qty;
            message = '장바구니에 해당 상품이 이미 존재하여, 수량이 업데이트되었습니다.';    
        }
        console.log('cart', cart);
        console.log('cartItemQty', cart.items.length);
        await cart.save();
        return res.status(200).json({ status: 'ok', message, cartItemQty: cart.items.length });

    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

cartController.getCart = async(req, res) => {
    try {
        const { userId } = req;

        const cart = await Cart.findOne({userId}).populate({
            path: 'items',
            populate: {
                path: 'productId',
                model: 'Product',
            } 
        });

        await cart.save();
        return res.status(200).json({ status: 'ok', cartItems: cart.items });

    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};


module.exports = cartController;