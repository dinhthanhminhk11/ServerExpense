const fs = require("fs-extra");
const path = require("path");

const UPLOAD_DIR = path.resolve(__dirname, "../", process.env.UPLOAD_PATH);

exports.saveFile = async (user, filename, fileBuffer) => {
    try {
        const userPath = path.join(UPLOAD_DIR, user);
        await fs.ensureDir(userPath); 

        const filePath = path.join(userPath, filename);
        await fs.writeFile(filePath, fileBuffer); 

        return { success: true, filePath };
    } catch (error) {
        console.error("Error saving file:", error.message);
        return { success: false, error: error.message };
    }
};
