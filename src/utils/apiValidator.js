const validator = require('validator');
const validateSignUp = (data) => {
  const allowedFields = ['firstName', 'lastName', 'emailId', 'password', 'username'];
  const isUpdateAllowed = Object.keys(data).every((key) =>
    allowedFields.includes(key)
  );
  if (!isUpdateAllowed) {
    throw new Error('Invalid Signup Fields');
  }
  const { firstName, lastName, emailId, password, username } = data;
  if (firstName)
    if (
      firstName.length < 3 ||
      firstName.length > 50 ||
      !validator.isAscii(firstName)
    )
      throw new Error('First Name is Invalid');
  if (lastName)
    if (
      lastName.length < 3 ||
      lastName.length > 50 ||
      !validator.isAscii(lastName)
    )
      throw new Error('Last Name is Invalid');
  if (password)
    if (
      password.length < 3 ||
      password.length > 20 ||
      !validator.isAscii(password)
    )
      throw new Error('Password is Invalid');
  if (emailId)
    if (emailId.length > 60 || !validator.isEmail(emailId))
      throw new Error('Email is Invalid');
  if (username)
    if (
      username.length < 3 ||
      username.length > 30 ||
      !/^[a-zA-Z0-9_]+$/.test(username)
    )
      throw new Error('Username is Invalid');
  return true;
};
const validateProfileUpdate = (data) => {
  const allowedFields = ['firstName', 'lastName', 'photoUrl', 'about', 'interests'];
  const isUpdateAllowed = Object.keys(data).every((field) =>
    allowedFields.includes(field)
  );
  if (isUpdateAllowed === false) {
    return false;
  } else {
    // parameter based checks
    if (data?.firstName) {
      if (data?.firstName.length < 3 || data?.firstName.length > 50)
        throw new Error('First Name is Invalid');
    }
    if (data?.lastName) {
      if (data?.lastName.length < 3 || data?.lastName.length > 50)
        throw new Error('Last Name is Invalid');
    }
    if (data?.photoUrl) {
      if (!validator.isURL(data?.photoUrl, { validate_length: true }))
        throw new Error('Photo URL is Invalid');
    }
    if (data?.about) {
      if (data?.about.length > 250 || !validator.isAscii(data?.about))
        throw new Error('About is Invalid');
    }
    if (data?.interests) {
      if (data?.interests.length > 10) throw new Error('Interests are Invalid');
      data?.interests.map((interest) => {
        if (interest.length > 100 || !validator.isAscii(interest))
          throw new Error('Interests are invalid');
      });
    }
  }
  return true;
};

module.exports = { validateProfileUpdate, validateSignUp };
