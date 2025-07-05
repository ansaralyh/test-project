const ErrorHandler = require('../utils/errorhandler');
const catchAsyncError = require('../middleware/catchAsyncErrors');
const User = require("../model/userModel");
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail')
const crypto = require('crypto')


/**Regisetr a user */
exports.registerUser = catchAsyncError(async (req, res, next) => {
    const { name, email, password } = req.body;
    const user = await User.create({
        name, email, password,
        avatar: {
            public_id: "This is a sample id",
            url: "profilePicUrl"

        }
    });
    sendToken(user, 201, res);
})

exports.loginUser = catchAsyncError(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new ErrorHandler("Please provide an email and password", 400));
    }

    // Check if the user exists in the database
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
        return next(new ErrorHandler("Please provide a valid email and password", 401));
    }

    // Compare passwords
    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid email and password", 401));
    }

    sendToken(user, 200, res);
});


/** Logout user */

exports.logout = catchAsyncError(async (req, res, next) => {


    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true
    })

    res.status(200).json({
        success: true,
        message: "Logged out!"
    })
});

/**Forgot Password */

exports.forgotPassword = catchAsyncError(async (req, res, next) => {
    // Find the user by their email
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(new ErrorHandler("User not found!", 404));
    }

    // Generate a reset token
    const resetToken = await user.getResetPasswordToken();
    // console.log(resetToken)

    // Save the user with the reset token, disabling validation for this operation
    await user.save({ validateBeforeSave: false });
    // console.log(user)

    // Create the reset password URL
    const resetPasswordUrl = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetToken}`;

    // Compose the email message
    const message = `Your password reset token:\n\n${resetPasswordUrl}. If you have not requested this email, please ignore it.`;

    try {
        // Send the reset password email
        await sendEmail({
            email: user.email,
            subject: 'Reset your password',
            message
        });

        // Respond with a success message
        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} successfully`
        });

    } catch (error) {
        // If there is an error sending the email, clean up the user's reset token and expiration
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        // Save the user without validation
        await user.save({ validateBeforeSave: false });

        // Return an error response
        return next(new ErrorHandler(error.message, 500));
    }
});

/**Reset password */

exports.resetPassword = catchAsyncError(async (req, res, next) => {
    // Create a token hash
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');


    // console.log(req.params.token)


    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });
    // console.log(resetPasswordToken) // Debugging

    // console.log(user)   // Debugging

    if (!user) {
        return next(new ErrorHandler("Reset password token is invalid or the link has expired", 400));
    }

    if (req.body.password !== req.body.confirmPassword) {
        return next(new ErrorHandler("Passwords don't match", 400));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();
    sendToken(user, 200, res);
});


/** Get user details */

exports.getUserDetails = catchAsyncError(async (req, res, next) => {

    const user = await User.findById(req.user.id);
    res.status(200).json({
        success: true,
        user,
    })

})


/**Update user password */

exports.updatePassword = catchAsyncError(async (req, res, next) => {
    const user = await User.findById(req.user.id).select("+password");
    // console.log(user)

    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

    if (!isPasswordMatched) {
        return next(new ErrorHandler("old password is incorrect", 400));
    }

    if (req.body.newPassword !== req.body.confirmPassword) {
        return next(new ErrorHandler("Passwords does not matched", 400));
    }
    user.password = req.body.newPassword;

    await user.save();
    sendToken(user, 200, res)
})


/**Update Profile - except password */
exports.updateProfile = catchAsyncError(async (req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email
    }

    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFinfAndModify: false
    });
    res.status(200).json({
        success: true,
        message: `${req.body.name} and ${req.body.email} updated successfully`

    })
})


/**Get all users */

exports.getAllUsers = catchAsyncError(async (req, res, next) => {
    const users = await User.find();
    res.status(200).json({
        success: true,
        data: users
    });
})



/** Get single user details -- admin*/

exports.getSingleUser = catchAsyncError(async (req, res, next) => {

    const user = await User.findById(req.params.id);

    // console.log(user)

    if (!user) {
        return next(new ErrorHandler(`User does not exist with id ${req.params.id}`))
    }
    res.status(200).json({
        success: true,
        user,
    })

})



/**Update user role -- Admin */

exports.updateRole = catchAsyncError(async (req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
    }

    const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    res.status(200).json({
        success: true,
        user: user, // Include the updated user data in the response
        message: "User role updated successfully" // You can add a success message here
    });
});


/**Delete a user -- admin */
exports.deleteUser = catchAsyncError(async (req, res, next) => {
    const user = await User.findByIdAndRemove(req.params.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    res.status(200).json({
        success: true,
        message: "User deleted successfully"
    });
});



