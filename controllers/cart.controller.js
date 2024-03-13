const Cart = require("../models/Cart");
const cartController = {};
cartController.addItemToCart = async(req, res) => {
    try {
        const { userId } = req;
        const { productId, size, qty } = req.body;

        let cart = await Cart.findOne({userId});
        
        if(!cart) cart = new Cart({userId});

        const existItemIndex = cart.items.findIndex(item =>
            item.productId.toString() === productId &&
            item.size === size
        )

        let message = '';
        if(existItemIndex === -1) {
            cart.items = [...cart.items, {productId, size, qty}];
            message = "This item has been added to your shopping cart.";
        } else {
            cart.items[existItemIndex].qty += qty;
            message = 'The product already exists in the shopping cart, so the quantity has been updated';    
        }
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
        return res.status(200).json({ status: 'ok', cartItems: cart.items });

    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

cartController.deleteOrderItems = async(req,res) => {
    try {
        const {userId, orderList, orderNum} = req;
        const cart = await Cart.findOne({userId});
        if(!cart) throw new Error('Cart does not exist.')
        let isMatch = false;
        for(let i = cart.items.length -1; i >= 0; i--){
            let cartItem = cart.items[i];
            for(let j = 0; j < orderList.length; j++){
                let orderItem = orderList[j];
                if(cartItem.productId.equals(orderItem.productId) && cartItem.size === orderItem.size) {
                    isMatch = true;
                    if(cartItem.qty > orderItem.qty) {
                        cartItem.qty -= orderItem.qty;
                    } else {    
                        cart.items.splice(i, 1);
                    }
                } 
            }
        }
        if(!isMatch) throw new Error('There are no items in the cart that match the ordered item.');
        await cart.save();
        return res.status(200).json({ status: 'ok', orderNum});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
}

/*
order후 카트 비우기
받을거 => userId, orderList, orderNum
userId에 해당하는 카트 찾기
orderList 상품과 일치하는 카트 상품이 있을 경우
카트 수량이 더 많으면 수량 감소, 
카트 수량이 같으면 item 삭제 
orderList 상품과 일치하는 카트 상품이 없을 경우 구분값 사용하여 에러처리 
카트 저장
*/ 

module.exports = cartController;