module.exports = function (allowedPlatforms) {
    return function (req, res, next) {
        const userAgent = req.headers['user-agent'] || '';

        // Xác định platform từ User-Agent
        const isAndroid = /android/i.test(userAgent);
        const isIOS = /iphone|ipad|ipod/i.test(userAgent);
        const isWeb = /mozilla|chrome|safari/i.test(userAgent);

        const platformMap = {
            android: isAndroid,
            ios: isIOS,
            web: isWeb
        };

        const isAllowed = allowedPlatforms.some(platform => platformMap[platform]);

        if (!isAllowed) {
            return res.status(403).json({ error: "Platform not allowed" });
        }

        next();
    };
};