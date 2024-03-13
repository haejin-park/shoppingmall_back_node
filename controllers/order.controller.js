const Order = require("../models/Order");
const randomStringGenerator = require("../utils/randomStringGenerator");
const productController = require("./product.controller");
const orderController = {};
orderController.createOrder = async(req, res, next) => {
    try {
        const { userId } = req;
        const { totalPrice, shipTo, contact, orderList } = req.body;
        const inSufficientStockItem = await productController.checkItemListStock(orderList);
        if(inSufficientStockItem.length > 0) {
            const errorMessage = inSufficientStockItem.reduce((total, item)=> (total += item.message, ""))
            throw new Error(errorMessage);
        } 
        const newOrder = new Order({userId, totalPrice, shipTo, contact, orderNum: randomStringGenerator(), items: orderList});
        await newOrder.save();
        req.orderList = orderList;
        req.orderNum = newOrder.orderNum;
        next();
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

/*
프론트에서 정보 받아올거 shipTo, contact, totalPrice, orderList
상품 리스트 재고 확인(재고 확인 함수 사용 checkItemListStock(orderList전달))
재고가 충분하지 않은 상품 inSufficientStockItem
    재고가 충분하지 않은 상품이 있다 => 에러(reduce로 에러메세지 합쳐주기 )
    재고가 충분하지 않은 상품이 없다  => 오더 생성(주문 끝나고 예약번호 필요 하니까 같이 넣어주기(예약번호 생성 함수 사용))
Order 생성 후 카트 비워줄 수 있도록 orderList넘기기
*/ 
module.exports = orderController;