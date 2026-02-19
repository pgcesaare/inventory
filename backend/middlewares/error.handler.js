const { ValidationError, ForeignKeyConstraintError, UniqueConstraintError, ConnectionError, DatabaseError } = require('sequelize');
const boom = require('@hapi/boom');

function logErrors (err, req, res, next) {
  console.error(err);
  next(err);
}

function jsonSyntaxErrorHandler(err, req, res, next) {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({ 
        message: "JSON invalid, Check your sintax" });
    }
    next(err);
  }

function errorHandler(err, req, res, next) {
  res.status(500).json({
    message: err.message,
    stack: err.stack,
  });
}

function boomErrorHandler(err, req, res, next) {
  if (err.isBoom) {
    const { output } = err; 
    res.status(output.statusCode).json(output.payload);
  } else {
    next(err);
  }
}

function ormErrorHandler(err, req, res, next) {
  if (err instanceof ValidationError) {
    return res.status(400).json({
      statusCode: 409,
      message: err.name,
      errors: err.errors
    });
  }

  if (err instanceof ForeignKeyConstraintError) {
    return res.status(400).json({
      statusCode: 400,
      message: err.name,
      errors: err.errors
    })
  }

    if (err instanceof DatabaseError) {
      return res.status(400).json({
        statusCode: 400,
        message: err.name,
        errors: err.errors
      })
    }

  if (err instanceof UniqueConstraintError) {
    const firstError = Array.isArray(err.errors) && err.errors.length > 0 ? err.errors[0] : null
    const field = firstError?.path || Object.keys(err.fields || {})[0] || null
    const value = firstError?.value || (field ? err.fields?.[field] : null)
    const message = field && value
      ? `${field} "${value}" already exists.`
      : "A record with the same unique value already exists."

    return res.status(409).json({
      statusCode: 409,
      message,
      field,
      value,
      errors: err.errors
    })
  }

  if (err instanceof ConnectionError) {
    return res.status(500).json({
      message: "Database connection error",
    });
  }
  next(err)
  }

module.exports = { logErrors, errorHandler, boomErrorHandler, ormErrorHandler, jsonSyntaxErrorHandler }
