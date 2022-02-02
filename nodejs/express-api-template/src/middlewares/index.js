const jwt = require('jsonwebtoken')
const multer = require('multer')
const Joi = require('joi')

const {
  verifyToken,
  validateObject,
  generateNewTokensIfExpired,
} = require('../utilities')

const { User } = require('../models')

const { httpStatus } = require('../constants')

/**
 * @name handleFileUpload()
 * @type Middleware
 * @param req : HTTP Request
 * @param res : HTTP Response
 * @param next : Next Middleware
 * @description This middleware handle file uplods
 */
const handleFileUpload = multer({ dest: 'uploaded/' })

/**
 * @name validateHTTPBody()
 * @type Middleware
 * @param req : HTTP Request
 * @param res : HTTP Response
 * @param next : Next Middleware
 * @description Use this middleware to validate req.body input
 */
const validateHTTPBody = (validationScheme) => {
  return (req, res, next) => {
    try {
      const valErrors = validateObject(validationScheme, req.body)
      if (valErrors.length > 0) {
        return res.status(httpStatus.STATUS_BAD_REQUEST).json({ error: valErrors })
      }
      next()
    } catch (e) {
      console.error(e)
      return res.status(httpStatus.STATUS_SERVER_ERROR).json({
        error: 'ERROR: Server failed to process your request(s) please try again',
      })
    }
  }
}

const unAuthenticatedUrls = [
  '/healthcheck',
  '/api/v1/users/authenticate',
  '/api/v1/system/seed-data',
]

/**
 * @name extractUserFromToken()
 * @type Middleware
 * @param req : HTTP Request
 * @param res : HTTP Response
 * @param next : Next Middleware
 * @description Extract user information from the given token(JSON) then attach it to
 *       the HTTP Request Object. So, Apollo GraphQLExpress() should add the exacted
 *       user to it's context. If access token is not valid,
 *       created a new one by verifying refresh token.
 */
const extractUserFromToken = async (req, res, next) => {
  // Get tokens from request headers.
  const accessToken = req.headers['x-access-token']
  const refreshToken = req.headers['x-refresh-token']

  try {
    // If Access Token is not available. just skip to the next middleware.
    if (!accessToken || accessToken === '') {
      throw new Error('ERROR: AccessToken not specified')
      return next()
    }

    // Extract data from the access token
    const userFromAccessToken = await verifyToken(accessToken)

    if (!userFromAccessToken.username || userFromAccessToken.username == '') {
      throw new Error('ERROR: AccessToken Invalid')
    }

    // If data is present, attach the extracted data to the HTTP Request Object.
    req.user = userFromAccessToken
  } catch (err) {
    // Access token might be invalid. So, we have to create a new one.

    // Allow user to access the requested page if the page doesn't require authentication.
    const incomingUrl = req.originalUrl
    if (unAuthenticatedUrls.indexOf(incomingUrl) > -1) {
      return next()
    }

    // Verify Refresh Token.
    if (!refreshToken || refreshToken === '') {
      req.user = null

      return res
        .status(httpStatus.STATUS_UNAUTHORIZED)
        .json({ error: 'ERROR: Refresh token not found' })
    }

    // Extract data from refresh token.
    const userFromRefreshToken = await verifyToken(refreshToken)

    // If Refresh Token is invalid. Set "req.user" to NULL and do nothing.
    if (!userFromRefreshToken) {
      return res
        .status(httpStatus.STATUS_UNAUTHORIZED)
        .json({ error: 'ERROR: Invalid refresh token' })
    }

    // If Refresh Token is valid. Created new access token and refresh token.
    const { newRefreshToken, newAccessToken } = await generateNewTokensIfExpired(
      userFromRefreshToken,
    )

    // Update new refresh token to a specific user
    await User.updateOne({ _id: userFromRefreshToken._id }, { newRefreshToken })

    // Send newly created tokens back the the client via HTTP headers.
    res.set('Access-Control-Expose-Headers', 'x-access-token, x-refresh-token')
    res.set('x-access-token', newAccessToken)
    res.set('x-refresh-token', newRefreshToken)

    // Set the req.user to the new created user object from new access token.
    req.user = userFromRefreshToken
  }

  return next()
}

module.exports = {
  handleFileUpload,
  validateHTTPBody,
  extractUserFromToken,
}
