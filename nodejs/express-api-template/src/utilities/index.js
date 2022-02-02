const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const Joi = require('joi')
const fs = require('fs')

require('dotenv-safe').config()
const {
  SECRET_TOKEN_KEY,

  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET_NAME,
  AWS_REGION,
} = process.env

const S3UploadClient = new S3Client({
  region: AWS_REGION,
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
})

/**
 *
 * @name uploadToAWSS3()
 * @description Upload one file to AWS S3 storage.
 * @param {string} fileNameToSave
 * @param {string} pathToOriginalFile
 * @return {object} : API response from AWS S3.
 *
 */
const uploadToAWSS3 = async (fileNameToSave, pathToOriginalFile) => {
  try {
    const stream = fs.createReadStream(pathToOriginalFile)
    const params = {
      Bucket: AWS_S3_BUCKET_NAME,
      Key: `images/${fileNameToSave}`,
      Body: stream,
      ACL: 'public-read',
    }

    const results = await S3UploadClient.send(new PutObjectCommand(params))

    fs.unlinkSync(pathToOriginalFile)

    return results
  } catch (err) {
    console.log('uploadToAWSS3', err)
    throw err
  }
}

/**
 *
 * @name validateObject()
 * @description Check if `input` object follows the validation rule(s)
 *              specified in `schema` (Joi.Object)
 * @param {Joi.Object} schema : Object specifications.
 * @param {object} input      : Object to validate.
 * @return {Array<string>}    : List of errors of the attributes
 *                              that don't follow the specified rules.
 */
const validateObject = (schema, input) => {
  const validationResult = schema.validate(input)
  if (typeof validationResult.error !== 'undefined') {
    const errorList = validationResult.error.details.map((err) => err.message)
    return errorList
  }
  return []
}

/**
 *
 * @name verifyToken()
 * @description Verifying wether the given token is valid or not
 * @param {string} token : A token to verify
 * @return {object}      : extracted data from the given token
 *
 */
const verifyToken = async (token) => {
  try {
    if (validator.isEmpty(token) || !token || token === '') {
      throw new Error("ERROR: 1st parameter 'token' not specified")
    }

    const extractedData = await jwt.verify(token, SECRET_TOKEN_KEY)

    if (!extractedData) {
      throw new Error('ERROR: Token invalid!')
    }

    return extractedData
  } catch (e) {
    return null
  }
}

const ErrGenerateTokenPayloadNotSpecified = new Error(
  "ERROR: 1st parameter 'payload' is not specified",
)

const ErrGenerateTokenPayloadInvalidDataType = new Error(
  "ERROR: 1st parameter 'payload' must be an object",
)

const ErrorGenerateTokenTypeNotSpecified = new Error(
  "ERROR: 2nd parameter 'type' is not specified",
)

const ErrorGenerateTokenTypeInvalidDataType = new Error(
  "ERROR: 2nd parameter 'type' must be string",
)

const ErrorGenerateTokenTypeInvalidValue = new Error(
  "ERROR: 2nd parameter 'type' value must `accessToken` or `refreshToken`",
)

/**
 *
 * @name generateToken()
 * @description Generate accessToken or refreshToken depending on the parameter
 * @param {object} payload : Object contains data which will be storing in the Token
 * @param {string} type    : Possible values are 'accessToken' or 'refreshToken'
 * @return {string}        : a generated token
 *
 */
const generateToken = async (payload, type) => {
  if (!payload || typeof payload === 'undefined') {
    throw ErrGenerateTokenPayloadNotSpecified
  }

  if (!type || type === '') {
    throw ErrorGenerateTokenTypeNotSpecified
  }

  if (typeof payload !== 'object' || Array.isArray(payload) || payload === null) {
    throw ErrGenerateTokenPayloadInvalidDataType
  }

  if (typeof type !== 'string') {
    throw ErrorGenerateTokenTypeInvalidDataType
  }

  if (type === 'accessToken') {
    return jwt.sign(payload, SECRET_TOKEN_KEY, { expiresIn: 60 * 60 * 9999 })
  } else if (type === 'refreshToken') {
    return jwt.sign(payload, SECRET_TOKEN_KEY) // This token will last forever
  } else {
    throw ErrorGenerateTokenTypeInvalidValue
  }
}

const ErrGenerateNewTokensIfExpiredPayloadNotSpecified = new Error(
  "ERROR: 1st parameter 'refreshToken' not specified!",
)

/**
 *
 * @name generateNewTokensIfExpired()
 * @description Generate new both access/refresh tokens of old accessToken is expired
 * @param {object} payload  : payload from old refreshToken
 * @return {object}         : contains new refresh/access tokens
 *
 */
const generateNewTokensIfExpired = async (payload) => {
  if (!payload || payload == null) throw ErrGenerateNewTokensIfExpiredPayloadNotSpecified
  const newRefreshToken = await generateToken(payload, 'refreshToken')
  const newAccessToken = await generateToken(payload, 'accessToken')
  return { newRefreshToken, newAccessToken }
}

module.exports = {
  verifyToken,

  generateToken,
  ErrGenerateTokenPayloadNotSpecified,
  ErrorGenerateTokenTypeNotSpecified,
  ErrorGenerateTokenTypeInvalidDataType,
  ErrGenerateTokenPayloadInvalidDataType,
  ErrorGenerateTokenTypeInvalidValue,

  uploadToAWSS3,
  validateObject,

  generateNewTokensIfExpired,
  ErrGenerateNewTokensIfExpiredPayloadNotSpecified,
}
