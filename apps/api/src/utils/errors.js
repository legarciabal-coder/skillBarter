class HttpError extends Error {
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
    this.details = details;
    }
}

// Express 4 no captura promesas rechazadas: este envoltorio las manda a next(err).
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { HttpError, asyncHandler };
