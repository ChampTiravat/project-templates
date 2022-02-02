const jwt = require('jsonwebtoken')
const {
  generateNewTokensIfExpired,
  ErrGenerateNewTokensIfExpiredPayloadNotSpecified,
} = require('../../src/utilities')

require('dotenv-safe').config()
const { SECRET_TOKEN_KEY } = process.env

const testData = {
  email: 'test@test.com',
  firstname: 'test_firstname',
  lastname: 'test_lastname',
}

describe('Test generateNewTokensIfExpired()', () => {
  test('should generate access tokens', async () => {
    const { newAccessToken } = await generateNewTokensIfExpired(testData)
    const decodedData = jwt.verify(newAccessToken, SECRET_TOKEN_KEY)

    expect(decodedData.email).toBe(testData.email)
    expect(decodedData.firstname).toBe(testData.firstname)
    expect(decodedData.lastname).toBe(testData.lastname)
    expect(decodedData.exp).not.toBeUndefined()
    expect(typeof decodedData.exp).toBe('number')
  })

  test('should generate refresh tokens', async () => {
    const { newRefreshToken } = await generateNewTokensIfExpired(testData)
    const decodedData = jwt.verify(newRefreshToken, SECRET_TOKEN_KEY)

    expect(decodedData.email).toBe(testData.email)
    expect(decodedData.firstname).toBe(testData.firstname)
    expect(decodedData.lastname).toBe(testData.lastname)
    expect(decodedData.exp).toBeUndefined()
  })

  test('should error when generate tokens, missing `payload` case', async () => {
    await expect(generateNewTokensIfExpired(undefined)).rejects.toThrow(
      ErrGenerateNewTokensIfExpiredPayloadNotSpecified,
    )
  })
})
