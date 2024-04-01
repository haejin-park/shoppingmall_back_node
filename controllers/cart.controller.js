const { default: mongoose } = require("mongoose");
const { Types } = mongoose;
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

/* 
카트와 프로덕트 조인해서 갯수 구하기(populate쓰면 countDocument안되서 Aggregation로 변경)
=> userId매치
=> unwind로 items배열 풀어서 각 항목에 대해 lookup으로 product 조인
=> proejct 필요한 정보만 조회
=> items의 prodcutId와 products의 _id를 기준으로 조인
=> unset 불필요한 정보 제거
=> sort 상품을 넣은 일자가 최신순으로 되도록 정렬
키워드 있을 때만 match할 조건 push로 추가
전체 데이터수 => 배열복사 해서 조건 추가하여 카운트 파이프라인 별도로 만들어고 aggregate(count에 적은 itemsNum가 키값)
한 페이지 보여줄 아이템 갯수, 생략할 갯수, 총 페이지 수
한 화면에 8개씩 나오게 skipAmount보다 클 때만 skip, limit적용 후 aggregate
*/
cartController.getCart = async(req, res) => {
    try {
        const { userId } = req;
        let { currentPage, searchKeyword } = req.query;
        let totalPipeline = [
            { $match: { userId: new Types.ObjectId(userId) } },
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
        if(!cart) throw new Error('장바구니가 존재하지 않습니다.');
        return res.status(200).json({status: 'ok', cartItemCount: cart.items.length});
    } catch(error) {
        return res.status(400).json({status: 'fail', message:error.message});
    }
}

cartController.deleteCartItem = async(req,res) => {
    try {
        const {userId} = req;
        let _id = req.params.id;
        _id = new Types.ObjectId(_id);

        const cart = await Cart.findOneAndUpdate(
            {userId, "items._id":_id}, 
            {$pull: {items:{_id}}}, 
            {new:true}
        );
        console.log('cart',cart);
        if(!cart) throw new Error('장바구니가 존재하지 않습니다.');
        return res.status(200).json({ status: 'ok', cartItemCount: cart.items.length});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
}

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

//나중에 업데이트한 상품 이름도 붙여주기
cartController.updateCartItemQty = async(req, res) => {
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
                item.qty = selectedQty;
                message = '헤당 상품의 수량이 업데이트 되었습니다.';   
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

module.exports = cartController;