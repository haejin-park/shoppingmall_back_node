const productController = {};
const mongoose = require('mongoose');
const Product = require('../models/Product');
productController.createProduct = async(req, res) => {
    try {
        console.log('req.body', req.body);
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

productController.getProductList = async(req, res) => {
    try {
        const {page, name} = req.query;
        const condition = name? {name: {$regex:name, $options:"i"}}: {};
        condition.isDeleted = false;
        let query = Product.find(condition);
        let totalPageNum = 1;
        if(page){
            const PAGE_SIZE = 8 
            //생략할 수, 최대 보여줄 수
            query.skip((page - 1)* PAGE_SIZE).limit(8)
             //최종 몇개의 페이지 = 전체 데이터 개수 / PAGE_SIZE
            const totalItemNum = await Product.find(condition).count(); 
            totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);
        }
        const productList = await query.exec();
        if(productList.length === 0) throw new Erorr('조회된 상품이 없습니다.')
        res.status(200).json({status: 'ok', productList, totalPageNum});
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

/*
받아올거 => 주문 상품
리턴할거 => 상품 재고 상태, 메세지
내가 사려는 상품 찾기
상품 재고(키값이 사이즈)가 주문한 아이템 수량보다 적으면 상태와 메세지와 반환(팝업 보여줄거)
상품 재고(키값이 사이즈)가 주문한 아이템 수량보다 많으면 재고 빼주기(새 재고 배열만들어서 빼고 다시 기존 배열에 할당)
*/

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
/*
받아올거 => 주문 상품 리스트
리턴할거 => 재고 부족 아이템 저장할 배열 inSufficientStockItem
itemList받아와서 map돌리기
재고 상태 확인 checkStock 
상품 재고 없으면(stockCheck.isVerify) 재고부족상품배열에 item, stockCheck.message넣어주기
비동기처리한것들 promise.all로 감싸주기
배열 리턴
*/

productController.deleteProduct = async(req, res) => {
    try {
        const _id = req.params.id;
        const {page, name} = req.query;
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