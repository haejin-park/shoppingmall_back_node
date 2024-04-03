const productController = {};
const Product = require('../models/Product');
productController.createProduct = async(req, res) => {
    try {
        const { sku, name, size, image, price, description, stock, category, status } = req.body;
        const product = await new Product({sku, name, size, image, price, description, stock, category, status});
        if(!product) throw new Erorr('상품 생성에 실패하였습니다.')
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
        if(!product) throw new Erorr('상품 정보 수정 및 조회에 실패하였습니다.')
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
        let {currentPage, searchKeyword, sortBy} = req.query;
        const condition = searchKeyword? {name: {$regex:searchKeyword, $options:"i"}}: {};
        condition.isDeleted = false;
        let query = Product.find(condition);
        if(sortBy === 'latest') query = query.sort({createdAt: -1});
        // // if(sortBy === 'orderOfPurchase') order페이지 완성 후 진행
        let totalPageNum = 1;
        if(currentPage){
            const totalItemNum = await Product.find(condition).countDocuments();
            const PAGE_SIZE = 8 
            const skipAmount = (currentPage - 1)* PAGE_SIZE;
            if(totalItemNum > skipAmount) {
                query = query.skip(skipAmount).limit(PAGE_SIZE)
            } else {
                currentPage = 1
            } 
            totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);

        }
        let productList = await query.exec();
        res.status(200).json({status: 'ok', productList, totalPageNum, currentPage});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

productController.getProduct = async(req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findById(id);
        if(!product) throw new Erorr('조회된 상품이 없습니다.')
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

productController.checkItemListStock = async(itemList) => {
    let inSufficientStockItem = [];
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
        if(!product) throw new Erorr('상품 삭제 및 조회에 실패하였습니다.')
        await product.save();
        res.status(200).json({status: 'ok'});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

module.exports = productController;