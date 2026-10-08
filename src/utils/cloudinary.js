import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    secure: true,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (localFilePath) => {
    if(!localFilePath) throw new Error("A local file path is required for Cloudinary upload");

    let uploadError;
    try {
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        return response;
    } catch(error) {
        uploadError = error;
        console.error("Error uploading to Cloudinary:", error);
        throw error;
    } finally {
        if(fs.existsSync(localFilePath)) {
            try {
                fs.unlinkSync(localFilePath);
            } catch(cleanupError) {
                if(uploadError) {
                    console.error("Error removing temporary upload:", cleanupError);
                } else {
                    throw cleanupError;
                }
            }
        }
    }
}

export {uploadToCloudinary};
