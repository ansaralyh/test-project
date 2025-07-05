const express = require('express');
const { registerUser,
    loginUser,
    logout,
    forgotPassword,
    resetPassword,
    getUserDetails,
    updatePassword,
    updateProfile,
    getAllUsers,
    getSingleUser,
    updateRole,
    deleteUser } = require('../controllers/userControllers');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');
const router = express.Router();


/**Register route */
router.route("/register")
    .post(registerUser);

/**Logi route */
router.route("/login")
    .post(loginUser);

/**forgot password route */
router.route("/password/forgot")
    .post(forgotPassword);

/**Reset password route */
router.route("/password/reset/:token")
    .put(resetPassword);

/**Logout passwrod route */
router.route("/logout").get(logout);


/**Get User detail routes */

router.route("/me").get(isAuthenticatedUser, getUserDetails)

/**Update password */

router.route("/password/update").put(isAuthenticatedUser, updatePassword);

/**Update profile */
router.route("/me/update").put(isAuthenticatedUser, updateProfile);


/**Get all users -- admin */

router.route("/admin/users").get(isAuthenticatedUser, authorizeRoles("admin"), getAllUsers);


/**Get single user details route -- admin */


router
    .route("/admin/user/:id")
    .get(isAuthenticatedUser, authorizeRoles("admin"), getSingleUser)
    .put(isAuthenticatedUser, authorizeRoles("admin"), updateRole)
    .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteUser);

module.exports = router  