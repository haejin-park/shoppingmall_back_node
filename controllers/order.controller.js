const { mongoose } = require("mongoose");
const Order = require("../models/Order");
const randomStringGenerator = require("../utils/randomStringGenerator");
const productController = require("./product.controller");
const orderController = {};
orderController.createOrder = async(req, res, next) => {
    try {
        const { userId } = req;
        let { orderList } = req.body;
        const inSufficientStockItem = await productController.checkItemListStock(orderList);
        if(inSufficientStockItem.length > 0) {
            const errorMessage = inSufficientStockItem.reduce((total, item)=> (total += item.message, ""))
            throw new Error(errorMessage);
        } 
        let orderNum = randomStringGenerator();
        orderList = orderList.map(data => ({...data, info:{...data.info, orderNum}}));
        let order = await Order.findOne({userId});
        if(!order) {
            order = new Order({userId, data: orderList}); 
        } else {
           orderList = orderList.map(data => order.data.push(data)); 
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
        let { currentPage, searchKeyword, mode } = req.query;
        let totalPipeline = [
            { $unwind: "$data" }, 
            { $project: {
                    "userId":1,
                    "data":1
            }},
            { $lookup: {
                from: "users", 
                localField: "userId",
                foreignField: "_id",
                as: "userData",
            }},
            { $lookup: {
                from: "products", 
                localField: "data.items.productId",
                foreignField: "_id",
                as: "productData",
            }},
            { $addFields: {
                "data.userData": { $arrayElemAt: ["$userData",0]},
                "data.items": {
                    $map: {
                        input: "$data.items",  
                        as: "item",  
                        in: { 
                            $mergeObjects: [
                                "$$item",
                                {
                                    productData: {
                                        $arrayElemAt: [ 
                                            "$productData",
                                            { $indexOfArray: ["$productData._id", "$$item.productId"] } 
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                },
            }},
            {$project: {
                    userData:0,
                    productData: 0,
            }},
            { $unset: [
                    "_id",
                    "data.userData.createdAt", 
                    "data.userData.updatedAt", 
                    "data.userData.__v", 
                    "data.userData._id",
                    "data.items.productData.createdAt", 
                    "data.items.productData.updatedAt", 
                    "data.items.productData.__v", 
                    "data.items.productData._id"
            ]},
            { $sort: {
                "data.info.itemCreatedAt": -1
            }}
        ];
        mode === "customer" 
        ? totalPipeline.push({ $match: { userId: new mongoose.Types.ObjectId(userId)} }, {$unset: "userId"})
        : totalPipeline.push({$unset: "userId"});

        if(searchKeyword) {
            mode === "customer"
            ? totalPipeline.push({ $match: { "data.items.productData.name": { $regex: searchKeyword, $options: "i" } } })
            : totalPipeline.push({ $match: { "data.info.orderNum": { $regex: searchKeyword, $options: "i" } } })
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

orderController.updateOrder = async(req, res) => {
    try {
        let _id = req.params.id;
        const { orderItemIdList, orderStatusList, orderStatusReasonList } = req.body;
        let order = {};
        const orderItemsMap = new Map();
        for(let i in orderItemIdList) {
            let id = `${orderItemIdList[i]}`;
            let status = `${orderStatusList[i]}`;
            let statusReason = `${orderStatusReasonList[i]}`;
            orderItemsMap.set(id, {status, statusReason});  
        }
        for(let [id, order] of orderItemsMap){
            order = await Order.updateOne(
                { "data._id": _id, "data.items._id": id }, 
                { $set: { "data.$[].items.$[item].status": order.status, "data.$[].items.$[item].statusReason": order.statusReason } },
                { arrayFilters: [{ "item._id": id }] },  
                { new:true }
            );   
        }

        if(!order)  throw new Error('주문 상태 수정 및 조회에 실패하였습니다.');
        res.status(200).json({status: 'ok'});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

module.exports = orderController;