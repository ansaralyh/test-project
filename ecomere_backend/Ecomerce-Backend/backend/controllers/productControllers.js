const product = require('../model/schema');
const ErrorHandler = require('../utils/errorhandler');
const catchAsyncError = require('../middleware/catchAsyncErrors');
const ApiFeatures = require('../utils/apiFeatures');

/* Create product -- Admin Route */
exports.createProduct = catchAsyncError(async (req, res, next) => {
    req.body.user = req.user.id;
    const createdProduct = await product.create(req.body);
    res.status(201).json({
        success: true,
        product: createdProduct
    });
});

/* Get all products */
exports.getAllProducts = catchAsyncError(async (req, res, next) => {

    const resultPerPage = 5;
    const productCount = await product.countDocuments();
    const apiFeature = new ApiFeatures(product.find(), req.query).search()
        .filter()
        .pagination(resultPerPage);
    const products = await apiFeature.query;
    res.status(200).json({
        success: true,
        products
    });
});

/**Get single product details*/
exports.getProductDetails = catchAsyncError(async (req, res, next) => {

    const singleProduct = await product.findById(req.params.id);

    if (!singleProduct) {
        return next(new ErrorHandler("product not found !", 404))
    }
    res.status(200).json({
        success: true,
        product: singleProduct,
        productCount
    });


});

/* Find and update -- Admin */
exports.updateProduct = catchAsyncError(async (req, res, next) => {
    const updatedProduct = await product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    });

    if (!updatedProduct) {
        return next(new ErrorHandler("Product not found!", 404));
    }

    res.status(200).json({
        success: true,
        product: updatedProduct
    });
});

/**Delete product */
exports.deleteProduct = catchAsyncError(async (req, res, next) => {
    const removeProduct = await product.findById(req.params.id);

    if (!removeProduct) {
        return next(new ErrorHandler("Product not found!", 404));
    }

    await product.findByIdAndDelete(req.params.id);
    res.status(200).json({
        success: true,
        message: "Product deleted successfully!"
    });
});


/**Create Product Review */


exports.createProductReview = catchAsyncError(async (req, res, next) => {
    const { rating, comment, productId } = req.body;
    const review = {
        user: req.user._id,
        name: req.user.name,
        rating: Number(rating),
        Comment: comment  // Use "Comment" with a capital "C"
    };

    try {
        const productToUpdate = await product.findById(productId);

        if (!productToUpdate) {
            return next(new ErrorHandler("Product not found!", 404));
        }

        const isReviewed = productToUpdate.reviews.find(
            (rev) => rev.user.toString() === req.user._id.toString()
        );

        if (isReviewed) {
            productToUpdate.reviews.forEach((rev) => {
                if (rev.user.toString() === req.user._id.toString()) {
                    rev.rating = rating;
                    rev.Comment = comment;  // Use "Comment" with a capital "C"
                }
            });
        } else {
            productToUpdate.reviews.push(review);
            productToUpdate.numOfReviews = productToUpdate.reviews.length;
        }

        // Calculate the average rating correctly using .reduce
        const totalRatings = productToUpdate.reviews.reduce(
            (sum, rev) => sum + rev.rating,
            0
        );
        productToUpdate.ratings = totalRatings / productToUpdate.reviews.length;

        await productToUpdate.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
        });
    } catch (error) {
        return next(new ErrorHandler("Error in creating product review", 500));
    }
});


/**Get all reviews of a asingle product */

exports.getProductsReviews = catchAsyncError( async (req, res, next) =>{
    const product = await product.findById(req.query.id);

    if(!product) {
        
        next(new ErrorHandler("product not found",404))
    }
    res.status(200).json({
        success : true,
        reviews:product.reviews,
    })
})



/**Delete a product */

exports.deleteReview = catchAsyncError(async (req, res, next) =>{


    const product = await product.findById(req.query.id);

    if(!product) {
        
        next(new ErrorHandler("product not found",404))
    }

    const reviews = product.reviews.filter(rex => rev._id.toString() !== req.query.id.toString());
    const totalRatings = reviews.reduce(
        (sum, rev) => sum + rev.rating,
        0
    );
   const ratings = totalRatings / reviews.length;
   const numOfReviews = reviews.length;    

   await product.findByIdAndUpdate(req.query.productId,{
    reviews,
    ratings,
    numOfReviews
   },{
    new:true,
    runValidators:true,
    useFindAndModify:false
   })


    res.status(200).json({
        success : true,
      
    })
})