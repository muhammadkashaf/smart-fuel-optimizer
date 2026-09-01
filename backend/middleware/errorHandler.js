const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  if (err.name === "CastError") {
    return res.status(400).json({
      message: "The requested resource ID is invalid",
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    });
  }

  if (err?.code === 11000) {
    const duplicateField = Object.keys(err.keyValue || {})[0];
    const fieldMessage =
      duplicateField === "email"
        ? "An account with this email address already exists"
        : duplicateField === "registrationNumber"
          ? "A vehicle with this registration number already exists"
          : "A record with this value already exists";

    return res.status(409).json({
      message: fieldMessage,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    });
  }

  if (err.name === "ValidationError") {
    const firstError = Object.values(err.errors || {})[0];
    return res.status(400).json({
      message: firstError?.message || "Please check the provided information and try again",
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const message = statusCode === 500 ? "Something went wrong. Please try again later." : err.message;

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

export { notFound, errorHandler };
