const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const productSchema = Schema(
    {
        sku: {type:String, required:true, unique:true},
        name: {type:String, required:true},
        size: {type:Array, required:true},
        image: {type:String, required:true},
        price: {type:Number, required:true},
        description: {type:String, required:true},
        stock: {type:Object, required:true},
        category: {type:Array, required:true},
        status: {type:String, default:"active"},
        isDeleted: {type:Boolean, default:false},
    }, 
    {timestamps:true}
);

productSchema.methods.toJSON = function() {
    const obj = this._doc
    delete obj.createdAt
    delete obj.updatedAt
    delete obj.__v //버전정보
    return obj
}

const Product = mongoose.model("Product", productSchema);
module.exports = Product;