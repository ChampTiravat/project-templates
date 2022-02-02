const jwt = require('jsonwebtoken')
const {
  generateToken,
  ErrGenerateTokenPayloadNotSpecified,
  ErrorGenerateTokenTypeNotSpecified,
  ErrorGenerateTokenTypeInvalidDataType,
  ErrGenerateTokenPayloadInvalidDataType,
  ErrorGenerateTokenTypeInvalidValue,
} = require('../../src/utilities')

require('dotenv-safe').config()
const { SECRET_TOKEN_KEY } = process.env

const testData = {
  email: 'test@test.com',
  firstname: 'test_firstname',
  lastname: 'test_lastname',
}

describe('Test generateToken()', () => {
  test('should generate an access token', async () => {
    const token = await generateToken(testData, 'accessToken')
    const decodedData = jwt.verify(token, SECRET_TOKEN_KEY)

    expect(decodedData.email).toBe(testData.email)
    expect(decodedData.firstname).toBe(testData.firstname)
    expect(decodedData.lastname).toBe(testData.lastname)
    expect(decodedData.exp).not.toBeUndefined()
    expect(typeof decodedData.exp).toBe('number')
  })

  test('should error when `payload` has unsupported data-type case', async () => {
    await expect(generateToken([], 'accessToken')).rejects.toThrow(
      ErrGenerateTokenPayloadInvalidDataType,
    )
  })

  test('should error when missing `type` and `payload` case', async () => {
    await expect(generateToken()).rejects.toThrow(ErrGenerateTokenPayloadNotSpecified)
  })

  test('should error when `type` has unsupported data-type case', async () => {
    const unsupportedDataTypeInput = 10
    await expect(generateToken(testData, unsupportedDataTypeInput)).rejects.toThrow(
      ErrorGenerateTokenTypeInvalidDataType,
    )
  })

  test('should error when `type` has unsupported value case', async () => {
    const unsupportedInputValue = 'not_the_expected_input_string_value'
    await expect(generateToken(testData, unsupportedInputValue)).rejects.toThrow(
      ErrorGenerateTokenTypeInvalidValue,
    )
  })

  test('should error when generate access token, missing `payload` case', async () => {
    await expect(generateToken(undefined, 'accessToken')).rejects.toThrow(
      ErrGenerateTokenPayloadNotSpecified,
    )
  })

  test('should error when generate access token, missing `type` case', async () => {
    await expect(generateToken(testData, undefined)).rejects.toThrow(
      ErrorGenerateTokenTypeNotSpecified,
    )
  })

  test('Generate refresh token, normal case', async () => {
    const token = await generateToken(testData, 'refreshToken')
    const decodedData = jwt.verify(token, SECRET_TOKEN_KEY)

    expect(decodedData.email).toBe(testData.email)
    expect(decodedData.firstname).toBe(testData.firstname)
    expect(decodedData.lastname).toBe(testData.lastname)
    expect(decodedData.exp).toBeUndefined()
  })

  test('should error when generate refresh token, missing `payload` case', async () => {
    await expect(generateToken(undefined, 'refreshToken')).rejects.toThrow(
      ErrGenerateTokenPayloadNotSpecified,
    )
  })

  test('should error when generate refresh token, missing `type` case', async () => {
    await expect(generateToken(testData, undefined)).rejects.toThrow(
      ErrorGenerateTokenTypeNotSpecified,
    )
  })
})
