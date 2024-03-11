const productController = {};
const Product = require('../models/Product');

productController.createProduct = async(req, res) => {
    try {
        const {level} =  req;
        console.log('level', level);
        if(level !== 'admin') throw new Error('You cannot add a product because you do not have administrator privileges.');
        const { sku,name, size, image, price, description, stock, category, status } = req.body;
        const product = await new Product({sku, name, size, image, price, description, stock, category, status});
        await product.save();
        res.status(200).json({status: 'ok'});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

productController.getProducts = async(req, res) => {
    try {
        const productList = await Product.find({});
        if(!productList) throw new Error('상품이 존재하지 않습니다.');
        res.status(200).json({status: 'ok', productList});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

module.exports = productController;