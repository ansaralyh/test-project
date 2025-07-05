const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto')


const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please Enter your name"],
        maxLength: [10, "Name cannot exceed 10 Characters"],
        minLength: [5, "Name cannot be less than 5 characters "]
    },
    email: {
        type: String,
        required: [true, "Please enter your emaail"],
        unique: true,
        validate: [validator.isEmail, "Please enter a valid email"]

    },
    password: {
        type: String,
        required: [true, "Please enter your password"],
        minLength: [8, "Password cannot be less than 8 characters"],
        select: false
    },
    avatar: {
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    },
    role: {
        type: String,
        default: "user"
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date


});

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {

        next();

    }
    this.password = await bcrypt.hash(this.password, 10)
});
/**JWT token */

userSchema.methods.getJWTToken = function () {

    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    })
}
/**Compare password */


userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

/**Generating passwword reset token */



userSchema.methods.getResetPasswordToken = async function () {

    // Generate a token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash the token and set it to resetPasswordToken field

    this.resetPasswordToken = crypto.createHash('sha256')
        .update(resetToken)
        .digest('hex');
    // console.log(this)

    // Set the expiration time for the token (e.g., 15 minutes)
    this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;

    // Return the unhashed token
    return resetToken;
}

module.exports = mongoose.model("user", userSchema);
