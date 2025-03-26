import protobuf from "protobufjs";
const path = require('path');
const root = protobuf.loadSync(path.join(__dirname, "../../proto/auth.proto"));
const ErrorResponse = root.lookupType("ErrorResponse");
const Constants = require('../util/constants')
import { isGmail } from "../util/validators";
const validateEmail = (req, res, next) => {
    const { email } = req.decryptedData;

    if (!email || typeof email !== "string") {
        return res.status(400).send(ErrorResponse.encode({
            success: false,
            error: { code: Constants.EMAIL_MISSING, message: "Email is required" }
        }).finish());
    }

    if (!isGmail(email)) {
        return res.status(400).send(ErrorResponse.encode({
            success: false,
            error: { code: Constants.EMAIL_NOT_FORMAT, message: "Not a valid Gmail address" }
        }).finish());
    }

    next();
};

export default validateEmail;