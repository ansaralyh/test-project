const Order = require('../model/orderModel');
const product = require('../model/schema'); // Assuming 'schema' is your product schema
const User = require("../model/userModel");

const ErrorHandler = require('../utils/errorhandler');
const catchAsyncError = require('../middleware/catchAsyncErrors');

/**Create a new order */

exports.newOrder = catchAsyncError(async (req, res, next) => {

    const {
        shippingInfo,
        orderInfo, // Changed 'orderItems' to 'orderInfo'
        paymentInfo,
        itemsPrice,
        taxsPrice,
        shippingPrice,
        totalPrice,
        paidAt,
        user
    } = req.body; 

    const order = await Order.create({
        shippingInfo,
        orderInfo, // Changed 'orderItems' to 'orderInfo'
        paymentInfo,
        itemsPrice,
        taxsPrice,
        shippingPrice,
        totalPrice,
        paidAt: Date.now(), // Changed 'date.now()' to 'Date.now()'
        user: req.user._id
    });
    // console.log(order)
    res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        order,
    });
});


/**Get single order */

exports.getSingleOrder = catchAsyncError(async (req, res, next) =>{
    // console.log("api is working")
    const order = await Order.findById(req.params.id).populate(
        "user",
        "name email"
    );

    if (!order)
    {
        return next(new ErrorHandler("order not found with this id :", 404));
    }
    res.status(200).json({
        success:true,
        message:"your order is ",
        order,
    })
})
/**Get logged in user order */

exports.myOrders = catchAsyncError(async (req, res, next) => {
    const orders = await Order.find({ user: req.user._id }); 

    if (!orders) {
        return next(new ErrorHandler("Order not found with this id", 404));
    }

    res.status(200).json({
        success: true,
        message: "Your orders are",
        orders,
    });
});

/**Get all orders -- admin */

exports.getAllOrders = catchAsyncError(async (req, res, next) => {
    const orders = await Order.find();
    let totalAmount = 0;
    orders.forEach(order => {
        totalAmount += order.totalPrice
    }) 
    res.status(200).json({
        success: true,
        message: "Your orders are",
        orders,
        totalAmount,
    });
});
/**update order status -- admin */

exports.updateOrder = catchAsyncError(async (req, res, next) => {
    const order = await Order.find(req.params.id);
    
    if(order.orderStatus === "delivered"){
        return next(new ErrorHandler("You have already delivered this order"), 400);
    }

    order.orderItmes.forEach( async (order) => {
        await updateStock(order.product,order.quantity);
    });
    order.orderStatus = req.body.status;

    if(req.body.status === "delivered"){

        order.deliverAt = Date.now();
    }

    await order.save({validateBeforeSave: false})
    res.status(200).json({
        success: true,
        message: "Your orders are",
       
    });
});

async function updateStock(id,quantity){
    
    
    const product = await Product.findById(id);
    product.stock -= quantity;
    await product.save({ validateBeforeSave: false });
}

/**Delete order */
exports.deleteOrder = catchAsyncError(async (req, res, next) => {
    const orders = await Order.find(req.params.id);
    
    if (!orders) {
        return next(new ErrorHandler("Order not found with this id", 404));
    }
    await orders.remove();

    res.status(200).json({
        success: true,
        message: "Your order is deleted successfully",
      
    });
});