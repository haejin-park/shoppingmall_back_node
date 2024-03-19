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

module.exports = orderController;