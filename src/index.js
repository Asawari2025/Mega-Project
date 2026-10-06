//require("dotenv").config({path: "./.env"});
import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({path: "./.env"});



connectDB();














// import express from "express";

// const app = express();


// (async()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_Name}`);
//         console.log("Connected to MongoDB");
//         app.on("error",(err)=>{ console.log("Error while connecting to MongoDB",err);
//         throw err;
//     });

//     app.listen(process.env.PORT,()=>{
//         console.log(`Server is running on port ${process.env.PORT}`);
//     })
//     }catch(error){
//         console.error("Error connecting to MongoDB:", error);
//         throw error;
//     }
// })()