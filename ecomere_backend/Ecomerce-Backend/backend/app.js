const express = require('express');
const cookieParser = require('cookie-parser')
const errorMiddleware = require('../backend/middleware/error')
const app = express();

app.use(express.json());
app.use(cookieParser());

// middleware
/**import product routes */
const products = require('./routes/productRoutes')
app.use("/api/v1",products)
/**import user route */
const user = require("./routes/userRoutes")
app.use("/api/v1",user)
app.use(errorMiddleware);

/**import order route */
const order = require("./routes/orderRoutes")
app.use("/api/v1",order)

module.exports = app ;