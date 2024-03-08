const mongoose = require("mongoose");
const User = require("./User");
const Product = require("./Product");
const Schema = mongoose.Schema;
const cartSchema = Schema(
    {
        userId: {type:mongoose.ObjectId, required:true, ref:User},
        items: [
            {
                ProductId: {type:mongoose.ObjectId, ref:Product},
                size: {type:String, required:true},
                qty: {type:Number, default:1, required:true},
            },
        ],
    }, 
    {timestamps:true}
);

cartSchema.methods.toJSON = function() {
    const obj = this._doc
    delete obj.createdAt
    delete obj.updatedAt
    delete obj.__v //버전정보
    return obj
}

const Cart = mongoose.model("Cart", cartSchema);
moudule.exports = Cart;