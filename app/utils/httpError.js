exports.createHttpError = (status, message, extra = {}) =>
    Object.assign(new Error(message), { status, ...extra });
