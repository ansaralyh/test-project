const express = require('express');
const { getAllProducts,
     createProduct, 
     updateProduct, 
     deleteProduct, 
     getProductDetails, 
     createProductReview, 
     getProductsReviews,
     deleteReview} = require('../controllers/productControllers');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');
const { logout } = require('../controllers/userControllers');

const router = express.Router();

// Define your routes
router
    .route("/products")
    .get(getAllProducts);

router.route("/admin/products/new")
    .post(isAuthenticatedUser, authorizeRoles("admin"), createProduct);

router.route("/admin/products/:id")
    .put(isAuthenticatedUser, authorizeRoles("admin"), updateProduct)
    .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteProduct);

router.route("/products/:id").get(getProductDetails);

/**Product ratings */

router.route("/review").put(isAuthenticatedUser,createProductReview)

router.route("reviews").get(getProductsReviews).delete(isAuthenticatedUser,deleteReview)
module.exports = router;
