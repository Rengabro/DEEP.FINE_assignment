exports.createSuccessResponse = ({ message = '', resultData = null, resultCnt = 0 } = {}) => ({
    success: true,
    message,
    resultData,
    resultCnt
});

exports.createErrorResponse = ({ message, resultData = null, resultCnt = 0, invalidRows } = {}) => ({
    success: false,
    message,
    resultData,
    resultCnt,
    ...(invalidRows ? { invalidRows } : {})
});
