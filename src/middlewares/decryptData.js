import protobuf from "protobufjs";
const path = require('path');
const root = protobuf.loadSync(path.join(__dirname, "../../proto/auth.proto"));
const ErrorResponse = root.lookupType("ErrorResponse");
const Constants = require('../util/constants')
const encrypt = require('../../build/Release/addon');
const decryptData = (req, res, next) => {
    try {
        req.decryptedData = JSON.parse(encrypt.decryptData(req.parsedRequest.data));
        next();
    } catch (err) {
        return res.status(400).send(ErrorResponse.encode({
            success: false,
            error: { code: Constants.DATA_NOT_DECRYPT, message: "Invalid decrypted data format" }
        }).finish());
    }
};

export default decryptData;