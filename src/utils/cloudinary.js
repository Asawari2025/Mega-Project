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

const deleteFromCloudinary = async (imageUrl) => {
    let parsedUrl;
    try {
        parsedUrl = new URL(imageUrl);
    } catch {
        throw new Error("A valid Cloudinary image URL is required");
    }

    const uploadPathIndex = parsedUrl.pathname.indexOf("/upload/");
    if (parsedUrl.hostname !== "res.cloudinary.com" || uploadPathIndex === -1) {
        throw new Error("The image URL is not a Cloudinary upload URL");
    }

    const uploadedPath = parsedUrl.pathname.slice(uploadPathIndex + "/upload/".length);
    const pathParts = uploadedPath.split("/").map(decodeURIComponent);
    const versionIndex = pathParts.findIndex((part) => /^v\d+$/.test(part));
    const publicIdParts = versionIndex === -1
        ? pathParts
        : pathParts.slice(versionIndex + 1);

    if (publicIdParts.length === 0) {
        throw new Error("The Cloudinary image URL does not contain a public ID");
    }

    const lastPart = publicIdParts[publicIdParts.length - 1];
    publicIdParts[publicIdParts.length - 1] = lastPart.replace(/\.[^/.]+$/, "");
    const publicId = publicIdParts.join("/");

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    if (result.result !== "ok" && result.result !== "not found") {
        throw new Error(`Cloudinary image deletion failed: ${result.result}`);
    }

    return result;
}

export {uploadToCloudinary, deleteFromCloudinary};
