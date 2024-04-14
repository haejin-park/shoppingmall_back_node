const { mongoose } = require("mongoose");
const Cart = require("../models/Cart");
const cartController = {};
cartController.addCartItem = async(req, res) => {
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

cartController.getCartList = async(req, res) => {
    try {
        const { userId } = req;
        let { currentPage, searchKeyword } = req.query;
        let totalPipeline = [
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: "$items" },
            { $project:{"items":1} },
            { $lookup: {
                from: "products", 
                localField: "items.productId",
                foreignField: "_id",
                as: "productData",
            }},
            { $unset: [
                "_id",
                "productData.createdAt", 
                "productData.updatedAt", 
                "productData.__v", 
                "productData._id"
            ]},
            { $sort: {"items.itemCreatedAt": -1}}
        ];

        if(searchKeyword) {
            totalPipeline.push({ $match: { "productData.name": { $regex: searchKeyword, $options: "i" } } })
        }
        let countPipeline = [...totalPipeline, {$count:"itemsNum"}];
        const total = await Cart.aggregate(countPipeline);
        let totalItemNum = total?.length > 0 ? total[0].itemsNum : 0;
        const PAGE_SIZE = 8;
        const skipAmount = (currentPage -1) * PAGE_SIZE;
        let totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);

        if(currentPage){
            if(totalItemNum > skipAmount) {
                totalPipeline.push({$skip:skipAmount});
                totalPipeline.push({$limit:PAGE_SIZE});
            } else {
                currentPage = 1
            }
            
        }
        const cartList = await Cart.aggregate(totalPipeline);
        return res.status(200).json({ status: 'ok', cartList, totalPageNum, currentPage });

    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

cartController.getCartItemCount = async(req,res) => {
    try {
        const {userId} = req;
        const cart = await Cart.findOne({userId});
        return res.status(200).json({status: 'ok', cartItemCount: cart? cart.items.length : 0});
    } catch(error) {
        return res.status(400).json({status: 'fail', message:error.message});
    }
}

cartController.deleteCartItem = async(req,res) => {
    try {
        const {userId} = req;
        let _id = req.params.id;
        const cart = await Cart.findOneAndUpdate(
            {userId, "items._id":_id}, 
            {$pull: {items:{_id}}}, 
            {new:true}
        );
        if(!cart) throw new Error('장바구니가 존재하지 않습니다.');
        return res.status(200).json({ status: 'ok', cartItemCount: cart.items.length});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
}

cartController.deleteOrderItems = async(req,res) => {
    try {
        const {userId, orderNum} = req;
        const {orderList,cartOrderStatus} = req.body;

        if(cartOrderStatus) {
            const cart = await Cart.findOne({userId});
            if(!cart) throw new Error('장바구니가 존재하지 않습니다.')
            let orderMap = new Map();
            const itemList = orderList.flatMap(data => data.items);

            itemList.forEach(item => {
                let key = `${item.productId}_${item.size}`;
                orderMap.set(key, item.qty);
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
        } else {
            return res.status(200).json({ status: 'ok', orderNum });
        }
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
}

cartController.updateCartItemQty = async(req, res) => {
    try {
        const { userId } = req;
        const { productId, cartItemInitialOptionObj, selectedOptionObj } = req.body;
        let cart = await Cart.findOne({userId});
        if(!cart) cart = new Cart({userId});

        const allKeys = Array.from(new Set([...Object.keys(cartItemInitialOptionObj), ...Object.keys(selectedOptionObj)]));
        let updatedItems = [];
        for(const size of allKeys) {
            const selectedValue = selectedOptionObj[size] || 0;
            const initialValue = cartItemInitialOptionObj[size] || 0;
            const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);

            if(selectedValue > 0 && initialValue === 0) {
                if(itemIndex > -1) {
                    cart.items[itemIndex].qty += selectedValue;
                } else {
                    updatedItems.push({productId, size, qty: selectedValue});
                }

            } else if(selectedValue > 0 && selectedValue !== initialValue) {
                if(itemIndex > -1) {
                    cart.items[itemIndex].qty = selectedValue;
                }
            } else if(selectedValue === 0 && initialValue > 0) {
                cart.items = cart.items.filter(item => !(item.productId.toString() === productId && item.size === size));
            }
        }
        cart.items = [...cart.items, ...updatedItems];
        await cart.save();
        let message = "장바구니 상품의 옵션이 변경되었습니다."
        return res.status(200).json({ status: 'ok', message, cartItemCount: cart.items.length });
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};


module.exports = cartController;