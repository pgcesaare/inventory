const { auth } = require('express-oauth2-jwt-bearer')
const { apiAudience, issuerBaseURL } = require('../config/config').config

const jwtCheck = auth({
  audience: apiAudience,
  issuerBaseURL: issuerBaseURL,
  tokenSigningAlg: 'RS256'
})

module.exports = { jwtCheck }
