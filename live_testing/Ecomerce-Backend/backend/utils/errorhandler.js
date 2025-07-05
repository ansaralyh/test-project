class ErrorHandler extends Error {
    constructor(message, statusCode) {
        // console.log(Error)
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ErrorHandler