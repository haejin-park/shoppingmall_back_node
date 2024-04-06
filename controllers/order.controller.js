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

// 상품명으로 검색
orderController.getMyOrderList = async(req, res) => {
    try {
        const { userId } = req;
        let { currentPage, searchKeyword } = req.query;
        let totalPipeline = [
            { $match: { 
                    userId: new mongoose.Types.ObjectId(userId)   
            }},
            { $unwind: "$data" }, //data배열 분해하여 각 항목에 대한 별도 문서 생성(만약 네이버처럼 리스트 조회시 상품리스트는 풀어서 보여주는걸로 바꾸고 싶으면 아래에 { $unwind: "$data.items" } 추가로 풀어서 사용하면됨)
            { $project: {
                    "data":1
            }},
            { $lookup: {
                    from: "products", 
                    localField: "data.items.productId",
                    foreignField: "_id",
                    as: "productData",
            }},
            { $addFields: {
                    "data.items.productData": { $arrayElemAt: ["$productData", 0] }
            }},
            {$project: {
                    productData: 0,
            }},
            { $unset: [
                    "_id",
                    "data.items.productData.createdAt", 
                    "data.items.productData.updatedAt", 
                    "data.items.productData.__v", 
                    "data.items.productData._id"
            ]},
            { $sort: {
                "data.info.itemCreatedAt": -1
            }}
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


//관리자는 전체 사용자 order볼 수 있게 
//userId로 user정보도 가져와야함
//orderNum으로 검색
//productData는 객체로 items안에, userData는 객체로
orderController.getAdminOrderList = async(req, res) => {
    try {
        let { currentPage, searchKeyword } = req.query;
        let totalPipeline = [
            { $unwind: "$data" },
            { $project: {
                    "userId":1,
                    "data":1,         
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
                    "data.items.productData": { $arrayElemAt: ["$productData", 0] }
            }},
            { $project: {
                    userData:0,
                    productData: 0,
            }},
            { $unset: [
                "_id",
                "userId",
                "data.userData.createdAt", 
                "data.userData.updatedAt", 
                "data.userData.__v", 
                "data.userData._id",
                "data.items.productData.createdAt", 
                "data.items.productData.updatedAt", 
                "data.items.productData.__v", 
                "data.items.productData._id"
            ]},
            { $sort: {"data.info.itemCreatedAt": -1}}
        ];

        if(searchKeyword) {
            totalPipeline.push({ $match: { "data.info.orderNum": { $regex: searchKeyword, $options: "i" } } })
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

orderController.getOrderDetail = async(req, res) => {
    try {
        const id = req.params.id;
        const order = await Order.findById(id);
        if(!order) throw new Erorr('조회된 주문이 없습니다.')
        res.status(200).json({status: 'ok', order});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

module.exports = orderController;