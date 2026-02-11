const boom = require('@hapi/boom');

function validatorHandler(schema, property) {
  return (req, res, next) => {
    const data = req[property]; // body, params o query
    const { error } = schema.validate(data, { abortEarly: false });
    if (error) {
      return next(boom.badRequest(error));
    }
    next();
  };
}

module.exports = validatorHandler;