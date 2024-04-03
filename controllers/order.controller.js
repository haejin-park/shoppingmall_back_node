const { mongoose } = require("mongoose");
const Order = require("../models/Order");
const randomStringGenerator = require("../utils/randomStringGenerator");
const productController = require("./product.controller");
const orderController = {};
orderController.createOrder = async(req, res, next) => {
    try {
        const { userId } = req;
        let { orderList } = req.body.orderData; 
        const inSufficientStockItem = await productController.checkItemListStock(orderList);
        if(inSufficientStockItem.length > 0) {
            const errorMessage = inSufficientStockItem.reduce((total, item)=> (total += item.message, ""))
            throw new Error(errorMessage);
        } 
        let orderNum = randomStringGenerator();
        orderList = orderList.map(item => ({
            ...item,
            orderNum:orderNum
        }));
        let order = await Order.findOne({userId});
        if(!order) {
            order = new Order({userId, items: orderList}); 
        } else {
           orderList.forEach(item => order.items.push(item)); 
        }
        await order.save();
        req.orderNum = orderNum;
        next();
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

orderController.getOrderList = async(req, res) => {
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
        const total = await Order.aggregate(countPipeline);
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
        const orderList = await Order.aggregate(totalPipeline);
        return res.status(200).json({ status: 'ok', orderList, totalPageNum, currentPage });

    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

module.exports = orderController;