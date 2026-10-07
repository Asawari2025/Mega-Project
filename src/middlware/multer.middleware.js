import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '.public/temp');   
        //cb is a callback function that takes two arguments: an error (if any) and the destination path where the file should be stored. In this case, we are specifying that the uploaded files should be stored in the 'uploads/' directory.
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

export const upload = multer({ storage: storage });