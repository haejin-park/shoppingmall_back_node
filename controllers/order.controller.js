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

//해결해야할거 => 각 items의 productId에 해당하는 상품 나오게

//소비자는 상품명으로 검색, 관리자는 orderNum으로 검색
//관리자는 전체 사용자 order볼 수 있게 
//productData는 객체로 items안에, userData는 객체로
orderController.getOrderList = async(req, res) => {
    try {
        const { userId } = req;
        let { currentPage, searchKeyword, mode } = req.query;
        let totalPipeline = [
            { $unwind: "$data" }, //data배열 분해하여 각 항목에 대한 별도 문서 생성(만약 네이버처럼 리스트 조회시 상품리스트는 풀어서 보여주는걸로 바꾸고 싶으면 아래에 { $unwind: "$data.items" } 추가로 풀어서 사용하면됨)
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
                        input: "$data.items", //순회할 배열 지정
                        as: "item", //각 요소를 가르키는 변수
                        in: { //추가 작업
                            $mergeObjects: [
                                "$$item",
                                {
                                    productData: {
                                        $arrayElemAt: [ //특정 위치 요소 반환
                                            "$productData",
                                            { $indexOfArray: ["$productData._id", "$$item.productId"] } //배열 인덱스로 item.productId에 해당하는 productData._id
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

orderController.getOrderDetail = async(req, res) => {
    try {
        const id = req.params.id;
        const order = await Order.findById(id);
        if(!order) throw new Error('조회된 주문이 없습니다.')
        res.status(200).json({status: 'ok', order});
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
            orderItemsMap.set(id, {status, statusReason}); //Map만들기 key:id, value:status
        }
        for(let [id, order] of orderItemsMap){
            order = await Order.updateOne(
                { "data._id": _id, "data.items._id": id }, 
                { $set: { "data.$[].items.$[item].status": order.status, "data.$[].items.$[item].statusReason": order.statusReason } },
                { arrayFilters: [{ "item._id": id }] }, //각 item의 status를 update하기 위해 해당 고유 식별자에 해당하는 item만 필터링
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