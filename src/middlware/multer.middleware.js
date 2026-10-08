import multer from "multer";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const uploadDirectory = fileURLToPath(new URL("../../Public/temp", import.meta.url));
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDirectory);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

export const upload = multer({ storage: storage });