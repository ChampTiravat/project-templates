const validator = require('validator')
const express = require('express')
const bcrypt = require('bcrypt')
const Joi = require('joi')

const { validateObject, generateToken } = require('../utilities')
const { validateHTTPBody } = require('../middlewares')
const { httpStatus } = require('../constants')
const { User } = require('../models')

require('dotenv-safe').config()
const { PASSWORD_SALT_ROUND } = process.env

const userRouter = express.Router()

// login,
userRouter.post(
  '/authenticate',
  validateHTTPBody(
    Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required(),
    }),
  ),
  async (req, res) => {
    try {
      const { username, password } = req.body
      const user = await User.findOne({ username })
      if (!user) {
        return res
          .status(httpStatus.STATUS_UNAUTHORIZED)
          .json({ result: 'ERROR: user does not exists' })
      }

      const isPasswordValid = await bcrypt.compareSync(password, user.password)
      if (isPasswordValid === false) {
        return res
          .status(httpStatus.STATUS_UNAUTHORIZED)
          .json({ result: 'ERROR: failed to authenticate' })
      }

      const jwtData = {
        userId: user._id,
        role: user.role,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
      }
      const accessToken = await generateToken(jwtData, 'accessToken')
      const refreshToken = await generateToken(jwtData, 'refreshToken')

      await User.findOneAndUpdate({ _id: user._id }, { refreshToken })

      return res.status(httpStatus.STATUS_OK).json({
        result: 'ok',
        accessToken,
        refreshToken,
      })
    } catch (error) {
      console.error(error)
      return res.status(httpStatus.STATUS_SERVER_ERROR).json({
        error: 'ERROR: Server failed to process your request(s) please try again',
      })
    }
  },
)

// updateUser,
userRouter.patch('/:userIdOrUsername', async (req, res) => {
  try {
    const schema = Joi.object({
      firstname: Joi.string(),
      lastname: Joi.string(),
      username: Joi.string(),
      password: Joi.string(),
      role: Joi.string(),
    })
    const valErrors = validateObject(schema, req.body)
    if (valErrors.length > 0) {
      return res.status(httpStatus.STATUS_BAD_REQUEST).json({ error: valErrors })
    }

    const { userIdOrUsername } = req.params
    if (!userIdOrUsername) {
      return res
        .status(httpStatus.STATUS_BAD_REQUEST)
        .json({ error: 'ERROR: userId must be specified' })
    }

    const newUserData = { ...req.body }

    if (req.body.password && req.body.password.length > 0) {
      // Password encryption
      const salt = bcrypt.genSaltSync(Number(PASSWORD_SALT_ROUND))
      const hashedPassword = bcrypt.hashSync(newUserData.password, salt)
      newUserData.password = hashedPassword
    }

    const conditions = validator.isMongoId(userIdOrUsername)
      ? { _id: userIdOrUsername }
      : { username: userIdOrUsername }

    await User.updateOne(conditions, newUserData)

    const projections = '_id firstname lastname username role createdAt updatedAt'
    const updatedUser = await User.findOne(conditions, projections)

    return res.status(httpStatus.STATUS_OK).json({ result: 'ok', user: updatedUser })
  } catch (error) {
    console.error(error)
    return res.status(httpStatus.STATUS_SERVER_ERROR).json({
      error: 'ERROR: Server failed to process your request(s) please try again',
    })
  }
})

// deleteUser,
userRouter.delete('/:userIdOrUsername', async (req, res) => {
  try {
    const { userIdOrUsername } = req.params
    if (!userIdOrUsername) {
      return res
        .status(httpStatus.STATUS_BAD_REQUEST)
        .json({ error: 'ERROR: userId must be specified' })
    }

    const conditions = validator.isMongoId(userIdOrUsername)
      ? { _id: userIdOrUsername }
      : { username: userIdOrUsername }
    await User.deleteOne(conditions)

    return res.status(httpStatus.STATUS_OK).json({ result: 'ok' })
  } catch (error) {
    console.error(error)
    return res.status(httpStatus.STATUS_SERVER_ERROR).json({
      error: 'ERROR: Server failed to process your request(s) please try again',
    })
  }
})

// getOneUser,
userRouter.get('/:userIdOrUsername', async (req, res) => {
  try {
    const { userIdOrUsername } = req.params
    if (!userIdOrUsername) {
      return res
        .status(httpStatus.STATUS_BAD_REQUEST)
        .json({ error: 'ERROR: userId must be specified' })
    }

    const projections = '_id firstname lastname username role '
    const conditions = validator.isMongoId(userIdOrUsername)
      ? { _id: userIdOrUsername }
      : { username: userIdOrUsername }

    const user = await User.findOne(conditions, projections)

    return res.status(httpStatus.STATUS_OK).json({ result: 'ok', user })
  } catch (error) {
    console.error(error)
    return res.status(httpStatus.STATUS_SERVER_ERROR).json({
      error: 'ERROR: Server failed to process your request(s) please try again',
    })
  }
})

// getUsers,
userRouter.get('/', async (req, res) => {
  try {
    const { pageNum } = req.query

    const pageOptions = {
      limit: 10,
      page: pageNum || 1,
      sort: { createdAt: 'desc' },
      projection: '_id firstname lastname username role ',
      pagination: parseInt(pageNum) !== -1,
    }

    const users = await User.paginate({}, pageOptions)
    return res.status(httpStatus.STATUS_OK).json({ result: 'ok', ...users })
  } catch (error) {
    console.error(error)
    return res.status(httpStatus.STATUS_SERVER_ERROR).json({
      error: 'ERROR: Server failed to process your request(s) please try again',
    })
  }
})

// createUser,
userRouter.post(
  '/',
  validateHTTPBody(
    Joi.object({
      firstname: Joi.string().required(),
      lastname: Joi.string(),
      username: Joi.string().required(),
      password: Joi.string().required(),
      role: Joi.string().required(),
    }),
  ),
  async (req, res) => {
    try {
      const newUserData = { ...req.body }

      // Password encryption
      const salt = bcrypt.genSaltSync(Number(PASSWORD_SALT_ROUND))
      const hashedPassword = bcrypt.hashSync(newUserData.password, salt)
      newUserData.password = hashedPassword

      const newUser = await User.create(newUserData)

      return res.status(httpStatus.STATUS_OK).json({ result: 'ok', user: newUser })
    } catch (error) {
      console.error(error)
      return res.status(httpStatus.STATUS_SERVER_ERROR).json({
        error: 'ERROR: Server failed to process your request(s) please try again',
      })
    }
  },
)

module.exports = { userRouter }
