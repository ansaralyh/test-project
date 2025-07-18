const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt = require('jsonwebtoken');
const User = require('../model/userModel')


exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {

    const { token } = req.cookies;

    if (!token) {

        return next(new ErrorHandler("please login to access this resource", 401));
    }

    const decodedData = jwt.verify(token, process.env.JWT_SECRET)


    req.user = await User.findById(decodedData.id);
    next();
})

exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {

        if (!roles.includes(req.user.role)) {
            return next(new ErrorHandler(`role: ${req.user.role} is not alowed to access this resource`, 403))
        }
        next();
    }
};