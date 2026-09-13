const jwt = require('jsonwebtoken');
const { User } = require('../models/user');
const { userCache } = require('../utils/cache');

const userAuth = async (req, res, next) => {
  try {
    // extract token from cookies
    const { token } = req.cookies;
    if (!token) {
      return res.status(401).send('Token is Invalid');
    }
    // extract decoded secret from the token
    const { _id } = await jwt.verify(token, process.env.JWT_SECRET_TOKEN);
    // Cache the plain object, never the document: routes mutate req.user and
    // call .save(), so every request hydrates its own copy. Saves the Atlas
    // round-trip that previously ran before every authenticated handler.
    let userData = userCache.get(_id);
    if (!userData) {
      userData = await User.findById(_id).lean();
      if (!userData) {
        throw new Error('User does not Exist');
      }
      userCache.set(_id, userData);
    }
    // attach the user found to the req body and next
    req.user = User.hydrate(userData);
    next();
  } catch (err) {
    res.status(400).send('ERROR : ' + err.message);
  }
};

module.exports = { userAuth };
