import protobuf from "protobufjs";
const path = require('path');
const root = protobuf.loadSync(path.join(__dirname, "../../proto/auth.proto"));
const AuthRequest = root.lookupType("AuthRequest");
const ErrorResponse = root.lookupType("ErrorResponse");
const Constants = require('../util/constants')
const encrypt = require('../../build/Release/addon');
const decodeProtobuf = (req, res, next) => {
    try {
        const buffer = req.body;
        const request = AuthRequest.decode(new Uint8Array(buffer));

        if (!request.data) {
            return res.status(400).send(ErrorResponse.encode({
                success: false,
                error: {
                    code: Constants.DATA_MISSING,
                    message: "Missing request data"
                }
            }).finish());
        }

        try {
            req.decryptedData = JSON.parse(encrypt.decryptData(request.data));
            next();
        } catch (err) {
            return res.status(400).send(ErrorResponse.encode({
                success: false,
                error: {
                    code: Constants.DATA_NOT_DECRYPT,
                    message: "Invalid decrypted data format"
                }
            }).finish());
        }

    } catch (err) {
        return res.status(400).send(ErrorResponse.encode({
            success: false,
            error: {
                code: Constants.INVALID_PROTOBUF,
                message: "Invalid Protobuf format"
            }
        }).finish());
    }
};

export default decodeProtobuf;