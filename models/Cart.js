const mongoose = require("mongoose");
const User = require("./User");
const Product = require("./Product");
const Schema = mongoose.Schema;
const cartSchema = Schema(
    {
        userId: {type:mongoose.ObjectId, required:true, ref:User},
        items: [
            {
                productId: {type:mongoose.ObjectId, ref:Product},
                size: {type:String, required:true},
                qty: {type:Number, default:1, required:true},
                itemCreatedAt: {type: Date, default: Date.now}
            },
        ],
    }, 
    {timestamps:true}
);

cartSchema.methods.toJSON = function() {
    const obj = this._doc
    delete obj.createdAt
    delete obj.updatedAt
    delete obj.__v
    return obj
}

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;