export const getErrorMessage = (error: any, fallback = 'Unable to complete that request.') =>
  error?.response?.data?.message || fallback;
