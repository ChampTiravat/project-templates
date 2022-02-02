const mongoose = require("mongoose")
const mongoosePaginate = require('mongoose-paginate-v2');

const { userRoles } = require('../constants')

const UserSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: false,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: false,
      default: '',
    }
  },
  {
    timestamps: true,
    collection: 'users',
  },
)

UserSchema.plugin(mongoosePaginate);

const User = mongoose.model('User', UserSchema);

module.exports = {
  User
}
