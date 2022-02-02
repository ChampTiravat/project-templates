const httpStatus = {
  STATUS_OK: 200,
  STATUS_CREATED: 201,
  STATUS_NO_CONTENT: 204,
  STATUS_BAD_REQUEST: 400,
  STATUS_UNAUTHORIZED: 401,
  STATUS_NOT_FOUND: 404,
  STATUS_SERVER_ERROR: 500,
}

const dataStatus = {
  OK: 'OK',
  DISABLED: 'DISABLED',
  DELETED: 'DELETED',
}

module.exports = {
  httpStatus,
  dataStatus,
}
