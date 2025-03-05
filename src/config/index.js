export const formatResponseError = (code, message, details = null) => ({
  success: false,
  error: {
    code,
    message,
    ...(details && { details })
  }
});

export const formatResponseSuccess = (code, message, details = null) => ({
  success: true,
  data: {
    code,
    message,
    ...(details && { details })
  }
});


export const formatResponseSuccessNoData = (status, message) => ({
  status,
  message
});