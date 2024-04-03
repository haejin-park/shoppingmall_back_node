const mongoose = require("mongoose");
const User = require("./User");
const Product = require("./Product");
const Cart = require("./Cart");
const Schema = mongoose.Schema;
const orderSchema = Schema( 
    {
        userId: {type:mongoose.ObjectId, required:true, ref: User},
        status: {type:String, default:"preparing"},
        totalPrice: {type:Number, required:true, default: 0},
        shipTo: {type:Object, required:true},
        contact: {type:Object, required:true},
        orderNum: {type:String},
        items: [
            {
                productId: {type:mongoose.ObjectId, required:true, ref: Product},
                size: {type:String, required:true},
                qty: {type:Number, default:1, required:true},
                price: {type:Number, require:true}
            }
        ],
    }, 
    {timestamps:true}
);

orderSchema.methods.toJSON = function() {
    const obj = this._doc
    delete obj.createdAt
    delete obj.updatedAt
    delete obj.__v //버전정보
    return obj
}

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;