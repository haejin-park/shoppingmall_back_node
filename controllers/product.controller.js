const productController = {};
const Product = require('../models/Product');

productController.createProduct = async(req, res) => {
    try {
        const { sku,name, size, image, price, description, stock, category, status } = req.body;
        const product = await new Product({sku, name, size, image, price, description, stock, category, status});
        await product.save();
        res.status(200).json({status: 'ok'});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

productController.updateProduct = async(req, res) => {
    try {
        const productId = req.params.id;
        const { sku,name, size, image, price, description, stock, category, status } = req.body;
        const product = await Product.findByIdAndUpdate(
            {sku:productId}, 
            {sku, name, size, image, price, description, stock, category, status},
            {new:true}
        );
        if(!product) throw new Erorr('The product does not exist.')
        await product.save();
        res.status(200).json({status: 'ok', product});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

productController.getProducts = async(req, res) => {
    try {
        const products = await Product.find({});
        if(!products) throw new Erorr('The product does not exist.')
        res.status(200).json({status: 'ok', products});
    } catch (error) {
        res.status(400).json({status: 'fail', message: error.message});
    }
};

module.exports = productController;