const app = require('./app');
const dotenv = require('dotenv');
const connectDatabase = require("../backend/config/database");

/**Handling uncaught errors */

process.on("uncaughtException",(err)=>{
    console.log(`Error: ${err.message}`);
    console.log(`Server is shutting down due to uncaghgt exception`);
    process.exit(1);
})

/**config */



dotenv.config({path:"backend/config/config.env"})
/**connecting to database */

connectDatabase();

const server = app.listen(process.env.PORT,()=>{
    console.log(`server is running on http://localhost:${process.env.PORT}`)
})

/** Unhandeld promise rejection */

process.on("unhandledRejection",(err)=>{
    console.log(`Error: ${err.message}`);
    console.log("Server is shutting down due to unhandled promise rejection");
    server.close(()=>{
        process.exit(1);
    })
})