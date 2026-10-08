import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadToCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessRefreshTokens = async(userId) =>{
    try{
        const Userdb = await User.findById(userId)
        const accessToken = Userdb.generateAccessToken();
        const refreshToken = Userdb.generateRefreshToken();

        Userdb.refreshToken = refreshToken
        await Userdb.save({validateBeforeSave :false})

        return {accessToken, refreshToken}

    }catch(err){
        throw new ApiError(500,"something went wrong while genrating refresh and access token")
    }
}

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
     
     const { fullName, username, email, password } = req.body ?? {};


     if([fullName, email, username, password].some((field) => typeof field !== "string" || field.trim() === ""))
     {
        throw new ApiError(400,"all fields are required")
     }
     
    const existedUser = await User.findOne({
        $or : [{username},{email}]
     })

     if(existedUser){
        throw new ApiError(409,'User with email or username already exists')
     }

     //.files is given by multer which receives file from user
     const avtarLocalPath = req.files?.avatar?.[0]?.path;
     const coverImageLocalPath = req.files?.coverImage ? req.files?.coverImage?.[0]?.path: '';


    if(!avtarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadToCloudinary(avtarLocalPath);
    const coverImage = coverImageLocalPath
        ? await uploadToCloudinary(coverImageLocalPath)
        : null;


    if(!avatar){
         throw new ApiError(400,"Avatar file is required")
    }


    const user = await User.create({
        fullName, avatar: avatar.url, coverImage: coverImage?.url || "", email, username: username.toLowerCase(), password
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

const loginUser = asyncHandler(async(req,res)=>{
    //req body data username or email password 
    // check if its valid otherwise throw ApiError
    //then from User findone a/c that has same username and email
    // if yes then we should be able to login, new login redirect register
    //share access token and refresh token generate
    //send cookie
    //store token and compare from res when expired if it matches keep the session running
    //if expiry time limit is reached then ask user to login again

    const {username, email,password}= req.body ?? {};
    
    if(!(username || email) || typeof password !== "string" || password.length === 0){
        throw new ApiError(400,"username or email and password are required")
    }

    const user = await User.findOne({
        $or: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : [])
        ]
    })

    if(!user){
        throw new ApiError(404,"user does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials!")
    }

    const {accessToken, refreshToken} = await generateAccessRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


    //sending cookies

    const options ={
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken",refreshToken, options)
    .json(
        new ApiResponse(200,{
            user: loggedInUser, accessToken,
            refreshToken
        },
        "User logged in Successfully!!!"
        )
    )
})


const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                 refreshToken : undefined
            }
        },
        {
            new: true
        }
    )

    const options ={
        htttpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {},"User Logged Out!"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }

   try{
     const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken._id)

    if(!user){
        throw new ApiError(401,"Invalid refresh token")
    }

    if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401,"Refresh token is expired or used")
    }

    const options ={
        httpOnly:true,
        secure:true
    }

    const {accessToken, newRefreshToken }=await generateAccessRefreshTokens(user._id)

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken,options)
    .json(
        new ApiResponse(200,{
            accessToken, refreshToken: newRefreshToken 
        },
        "Access token refreshed"
    
    )
    )
   }catch(err){
    throw new ApiError(401, err.message || 
        "Invalid refresh token")
   }
    
})

export { registerUser, loginUser, logoutUser, refreshAccessToken}; 