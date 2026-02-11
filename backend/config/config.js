require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  authKey: process.env.AUTH_KEY,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL,
  apiAudience: process.env.API_AUDIENCE,
  databaseUrl: process.env.DATABASE_URL
}

module.exports = { config };