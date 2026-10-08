import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadToCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
     //res.status(200).json({ message: "User registered successfully" });

     //1. get user details from frontend
     //2. validation - not empty
     //3. check if user already exists: username, email
     //4. check for images, check for avatar
     //5. upload them to cloudinary,avatar,
     //6. create user object - create entry in db
     //7. remove password and refresh token field from response
     //8. check for user creation
     //9. return res
     
     const { fullName, username, email, password } = req.body;
     console.log("User details received:", { email, password });


     if([fullName, email, username, password].some((field) => field?.trim() === ""))
     {
        throw new ApiError(400,"all fields are required")
     }
     
    const existedUser = User.findOne({
        $or : [{username},{email}]
     })

     if(existedUser){
        throw new ApiError(409,'User with email or username already exists')
     }

     //.files is given by multer which receives file from user
    const avtarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avtarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadToCloudinary(avtarLocalPath);
    const coverImage = await uploadToCloudinary(coverImageLocalPath);


    if(!avatar){
         throw new ApiError(400,"Avatar file is required")
    }


    const user = await User.create({
        fullName, avatar: avatar.url, coverImage: coverImage?.url || "", email, username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    //removes password and refreshstoken from response

    if(!createdUser){
        throw new ApiError(500,"something odd happened while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser, "User registered successfully !!")
    )


    // if(fullName ===""){
    //     throw new ApiError(400, "Full name is required");
    //  }



});

export { registerUser }; 