const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  firstName: {
    type: 'String',
    maxLength: 50,
    minLength: 3,
    required: true,
    trim: true,
  },
  lastName: { type: 'String', maxLength: 50, minLength: 3, trim: true },
  username: {
    type: 'String',
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minLength: 3,
    maxLength: 30,
    validate(val) {
      if (!/^[a-zA-Z0-9_]+$/.test(val)) {
        throw new Error('Username is Invalid');
      }
    },
  },
  password: {
    type: 'String',
    required: true,
    trim: true,
  },
  emailId: {
    type: 'String',
    lowercase: true,
    required: true,
    maxLength: 60,
    trim: true,
    unique: true,
  },
  photoUrl: {
    type: 'String',
    default:
      'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg',
    maxLength: 2083,
  },
  interests: {
    type: [String],
    validate(val) {
      if (val.length > 10) {
        throw new Error('Cannot have more than 10 interests');
      }
    },
  },
  about: { type: 'String', maxLength: 250 },
});

// Never serialize the bcrypt hash: routes res.json() whole user documents
// (/profile/view, /login, /signup, /profile/edit).
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    return ret;
  },
});

userSchema.methods.generateJWT = async function () {
  const token = await jwt.sign({ _id: this.id }, process.env.JWT_SECRET_TOKEN, {
    expiresIn: '7d',
  });
  return token;
};

userSchema.methods.validatePassword = async function (passwordInputByUser) {
  const hashedPassword = this.password;
  const isLoginAllowed = await bcrypt.compare(
    passwordInputByUser,
    hashedPassword
  );
  return isLoginAllowed;
};

const User = mongoose.model('User', userSchema);
module.exports = { User };
