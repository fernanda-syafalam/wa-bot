const responseSuccess = (res, status_code = 200, message, data = null) => {
  return res.status(status_code).json({
    status_code,
    message,
    data
  });
};

const responseError = (res, error, status_code = 500) => {
  return res.status(status_code).json({
    status_code,
    error
  });
};

module.exports = { responseError, responseSuccess };
