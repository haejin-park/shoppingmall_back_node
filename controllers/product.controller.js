const productController = {};
const Order = require('../models/Order');
const Product = require('../models/Product');
productController.createProduct = async(req, res) => {
    try {
        const { sku, name, size, image, price, description, stock, category, status } = req.body;
        const skuProduct = await Product.findOne({sku});
        if(skuProduct) throw new Error('이미 존재하는 sku입니다. sku를 변경해주세요.')
        const product = await new Product({sku, name, size, image, price, description, stock, category, status});
        if(!product) throw new Error('상품 생성에 실패하였습니다.')
        await product.save();
        res.status(200).json({status: 'ok'});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

productController.updateProduct = async(req, res) => {
    try {
        const _id = req.params.id
        const { sku,name, size, image, price, description, stock, category, status } = req.body;
        const product = await Product.findByIdAndUpdate(
            {_id}, 
            {sku, name, size, image, price, description, stock, category, status},
            {new:true}
        );
        if(!product) throw new Error('상품 정보 수정 및 조회에 실패하였습니다.')
        await product.save();
        res.status(200).json({status: 'ok'});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

productController.getProductList = async(req, res) => {
    try {
        let {searchCategory, searchKeyword, currentPage, sortBy} = req.query;
        let condition = {isDeleted : false};
        if(searchCategory) condition.category = {$in: [searchCategory], $regex:searchCategory, $options:"i"}
        if(searchKeyword) condition.name = {$regex:searchKeyword, $options:"i"};
        let productList = [];
        const PAGE_SIZE = 8 
        const totalItemNum = await Product.find(condition).countDocuments();
        let totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);
        const skipAmount = (currentPage - 1)* PAGE_SIZE;
        if(currentPage && totalItemNum <= skipAmount) {
            currentPage = 1
        }
        if(sortBy === 'latest') {
            let totalProductList = Product.find(condition);
            totalProductList = totalProductList.sort({createdAt: -1});
            if(totalItemNum > skipAmount) {
                totalProductList = totalProductList.skip(skipAmount).limit(PAGE_SIZE)
            }
            productList = await totalProductList.exec();
        } else if(sortBy === 'popularity') {
            let orderOfPurchasePipeline = [
                { $unwind: "$data" },
                { $unwind: "$data.items" },
                { $group: {
                        _id: "$data.items.productId",
                        purchaseCount: { $sum: "$data.items.qty" }
                    }
                },
                { $sort: { purchaseCount: -1} },
            ];

            let purchaseOrderList = await Order.aggregate(orderOfPurchasePipeline);
            let totalProductList = await Product.find(condition);
            let orderProductIdList = totalProductList.length > 0 ? purchaseOrderList.map(item => item._id) : [];

            const categoryAndOrderProductMatchList = orderProductIdList.map(orderProductId => {
                return totalProductList.find(product => product._id.toString() === orderProductId.toString());
            }).filter(product => product !== undefined);
            
            orderProductIdList = categoryAndOrderProductMatchList.length > 0? categoryAndOrderProductMatchList.map(item => item._id) : [];
            let noOrderProcutIdList = totalProductList.filter((product) => {
                return !orderProductIdList.some((orderProductId) => {
                    return orderProductId.toString() === product._id.toString();
                });
            }).map(product => product._id);
            let productIdList = [...orderProductIdList, ...noOrderProcutIdList]
            let totalPipeline = [
                { $match: { _id: { $in: productIdList } } },  
                { $addFields: { __order: { $indexOfArray: [productIdList, "$_id" ] } } },  
                { $sort: { __order: 1 } } 
                ];
            
            if(totalItemNum > skipAmount) {
                totalPipeline.push({$skip:skipAmount});
                totalPipeline.push({$limit:PAGE_SIZE});
            } 
            productList = await Product.aggregate(totalPipeline)
        }
        if(productList.length === 0) totalPageNum = 0;
        res.status(200).json({status: 'ok', productList, totalPageNum, currentPage, sortBy});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

productController.getProductDetail = async(req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findById(id);
        if(!product) throw new Error('조회된 상품이 없습니다.')
        res.status(200).json({status: 'ok', product});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

productController.checkStock = async(item) => {
    const product = await Product.findById(item.productId);
    if(product.stock[item.size] < item.qty) {
        return {isVerify: false, message: `${product.name}의 ${item.size}사이즈 재고가 부족합니다.`};
    }
    const newStock = {...product.stock}; 
    newStock[item.size] -= item.qty;
    product.stock = newStock;
    await product.save(); 
    return {isVerify: true};

}

productController.checkItemListStock = async(orderList) => {
    let inSufficientStockItem = [];
    const itemList = orderList.flatMap(data => data.items); 
    await Promise.all(itemList.map(async(item) => {           
        const stockCheck = await productController.checkStock(item);
        if(!stockCheck.isVerify) {
            return inSufficientStockItem.push({item, message:stockCheck.message});
        }
        return stockCheck;
    }));
    return inSufficientStockItem;
} 

productController.deleteProduct = async(req, res) => {
    try {
        const _id = req.params.id;
        const product = await Product.findByIdAndUpdate(
            {_id}, 
            {isDeleted:true},
            {new:true}
        );
        if(!product) throw new Error('상품 삭제 및 조회에 실패하였습니다.')
        await product.save();
        res.status(200).json({status: 'ok'});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

module.exports = productController;