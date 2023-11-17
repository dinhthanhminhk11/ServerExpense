export const formatResponseError = (errors ,status, message, type) => ({
  errors,
  message: {
    status,
    message,
    type
  }
});

export const formatResponseSuccess = (data, status, message) => ({
  data,
  message: {
    status,
    message
  }
});


export const formatResponseSuccessNoData = ( status, message) => ({
    status,
    message
});