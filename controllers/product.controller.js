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

/*블라우스 2개인데 2페이지에서 블라우스 검색 시 8개 skip되서 조회된 상품 없다고 나오는 문제 해결 
  =>skipAmount보다 클 떄만 skip */
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
        } else if(sortBy === 'orderOfPurchase') {
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

            //카테고리 상품리스트중에 purchaseOrderList가 있다면 해당 상품리스트 반환(순서 보장)
            const categoryAndOrderProductMatchList = orderProductIdList.map(orderProductId => {
                return totalProductList.find(product => product._id.toString() === orderProductId.toString());
            }).filter(product => product !== undefined);
            
            // 없으면 안나오게
            orderProductIdList = categoryAndOrderProductMatchList.length > 0? categoryAndOrderProductMatchList.map(item => item._id) : [];
            let noOrderProcutIdList = totalProductList.filter((product) => {
                return !orderProductIdList.some((orderProductId) => {
                    return orderProductId.toString() === product._id.toString();
                });
            }).map(product => product._id);
            //주문순 상품 아이디 리스트, 그 밖의 상품 아이디 리스트 합치기
            let productIdList = [...orderProductIdList, ...noOrderProcutIdList]
            //productIdList에 나열된 순서대로 결과를 정렬
            let totalPipeline = [
                { $match: { _id: { $in: productIdList } } }, // productIdList에 있는 상품만 필터링
                { $addFields: { __order: { $indexOfArray: [productIdList, "$_id" ] } } }, // 각 문서에 순서 필드 추가
                { $sort: { __order: 1 } } // 추가된 순서 필드를 기준으로 정렬
                ];
            
            if(totalItemNum > skipAmount) {
                totalPipeline.push({$skip:skipAmount});
                totalPipeline.push({$limit:PAGE_SIZE});
            } 
            productList = await Product.aggregate(totalPipeline)
        }

        res.status(200).json({status: 'ok', productList, totalPageNum, currentPage});
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
    const itemList = orderList.flatMap(data => data.items); //배열의 배열 구조라서 flatMap사용
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