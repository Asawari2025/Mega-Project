import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () =>{
    try{
        const connectionInstance =await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        //console.log("connection instance has ",connectionInstance);
        console.log("Connected to MongoDB and DB host is running at ",connectionInstance.connection.host);
    }catch(error){
        console.log("MOngoDB connection Failed",error);
        process.exit(1);
    }
}


export default connectDB;
