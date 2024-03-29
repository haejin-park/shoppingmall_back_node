const Cart = require("../models/Cart");
const cartController = {};
cartController.addItemToCart = async(req, res) => {
    try {
        const { userId } = req;
        const { productId, selectedOptionObj } = req.body;
        let cart = await Cart.findOne({userId});
        if(!cart) cart = new Cart({userId});
        let message = '';

        let selectedMap = new Map();
        for(const size of Object.keys(selectedOptionObj)){
            let key = `${productId}_${size}`;
            selectedMap.set(key, selectedOptionObj[size])
        }
        let isMatch = false;
        cart.items.forEach(item => {
            let key = `${item.productId.toString()}_${item.size}`;
            if(selectedMap.has(key)){
                isMatch = true
                let selectedQty = selectedMap.get(key);
                item.qty += selectedQty;
                message = '장바구니에 해당 상품이 이미 존재하여 수량이 업데이트 되었습니다.';   
            }
        });
        if(!isMatch) {
            for(const size of Object.keys(selectedOptionObj)){
                cart.items = [...cart.items, {productId, size, qty:selectedOptionObj[size]}];
                message = "장바구니에 해당 상품을 추가하였습니다.";
            }
        }
        await cart.save();
        return res.status(200).json({ status: 'ok', message, cartItemCount: cart.items.length });
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
        return res.status(200).json({ status: 'ok', cartItems: cart.items });

    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

cartController.deleteOrderItems = async(req,res) => {
    try {
        const {userId, orderList, orderNum} = req;
        const cart = await Cart.findOne({userId});
        if(!cart) throw new Error('장바구니가 존재하지 않습니다.')
        let orderMap = new Map();
        orderList.forEach(orderItem => {
            let key = `${orderItem.productId}_${orderItem.size}`;
            orderMap.set(key,orderItem.qty);
        });

        let isMatch = false;
        for(let i = cart.items.length -1; i >= 0; i--){
            let cartItem = cart.items[i];
            let key = `${cartItem.productId}_${cartItem.size}`;

            if(orderMap.has(key)) {
                isMatch = true;
                let orderQty = orderMap.get(key);

                if(cartItem.qty > orderQty) {
                    cartItem.qty -= orderQty;
                } else {
                    cart.items.splice(i, 1);
                }
            }
        }
        if(!isMatch) throw new Error('장바구니에 일치하는 상품이 없습니다.');
        await cart.save();
        return res.status(200).json({ status: 'ok', orderNum, cartItemCount: cart.items.length});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
}

module.exports = cartController;