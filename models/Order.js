const mongoose = require("mongoose");
const User = require("./User");
const Product = require("./Product");
const Schema = mongoose.Schema;
const orderSchema = Schema( 
    {
        userId: {type:mongoose.ObjectId, required:true, ref: User},
        data: [
            {
                info: {
                    totalPrice: {type:Number, required:true, default: 0},
                    shipTo: {type:Object, required:true},
                    contact: {type:Object, required:true},
                    orderNum: {type:String},
                    itemCreatedAt: {type: Date, default: Date.now}
                },
                items: [
                    {
                        productId: {type:mongoose.ObjectId, required:true, ref: Product},
                        size: {type:String, required:true},
                        qty: {type:Number, default:1, required:true},
                        price: {type:Number, required:true},
                        status: {type:String, default:"상품 준비 중"},
                        statusReason: {type:String, default: ""}
                    }
                ]
            }
        ],
    }, 
    {timestamps:true}
);

orderSchema.methods.toJSON = function() {
    const obj = this._doc
    delete obj.createdAt
    delete obj.updatedAt
    delete obj.__v 
    return obj
}

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;