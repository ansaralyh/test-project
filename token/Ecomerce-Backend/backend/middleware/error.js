const ErrorHandler = require('../utils/errorhandler')
module.exports = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";

    // Wrong MOnodb ID error

    if(err.name === 'CastError')
    {
        const message = `Resources not found ${err.path}`;
        err = new ErrorHandler(message,400);
    }

    /**Mongoose duplicate key error */
   if(err.code === 11000){
    const message = `Duplicate ${Object.keys(err.keyValue)} Entered`
    err = new ErrorHandler(message,400);

   }
    /**Jason web token error */
   if(err.name === "JasonWebTokenError"){
    const message = "jaosn web token is invalid, Try again"
    err = new ErrorHandler(message,400);

   }
    /**Jason web token expire error */
   if(err.name === "TokenExpireError"){
    const message = "jaosn web token is expired, Try again"
    err = new ErrorHandler(message,400);

   }

    res.status(statusCode).json({
        success: false,
        message:err.message
       
    });
};