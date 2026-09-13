const express = require('express');
const { userAuth } = require('../middlewares/auth');
const profileRouter = express.Router();
const { validateProfileUpdate } = require('../utils/apiValidator');
const bcrypt = require('bcryptjs');
const { userCache } = require('../utils/cache');

profileRouter.get('/profile/view', userAuth, async (req, res) => {
  const user = req.user;
  res.json({
    message: 'Profile Fetched Successfully',
    user,
  });
});

profileRouter.patch('/profile/edit', userAuth, async (req, res) => {
  try {
    const data = req.body;
    if (!validateProfileUpdate(data)) {
      throw new Error('Invalid Update Fields');
    }
    // validate the request data
    const loggedInUser = req.user;
    // access logged in User you get from userAuth function in req.user
    Object.keys(req.body).forEach((key) => {
      loggedInUser[key] = req.body[key];
    });
    // update the fields
    await loggedInUser.save();
    // save back to the DATABASE
    userCache.delete(loggedInUser._id.toString());
    res.json({
      message: 'Profile Updated Successfully',
      loggedInUser,
    });
  } catch (err) {
    res.status(400).send('Error Update Failed : ' + err.message);
  }
});

profileRouter.patch('/profile/password', userAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) throw new Error('Invalid Request');
    const loggedInUser = req.user;
    let isEditAllowed = await loggedInUser.validatePassword(oldPassword);
    if (!isEditAllowed) throw new Error('Invalid Request');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    loggedInUser.password = hashedPassword;
    await loggedInUser.save();
    userCache.delete(loggedInUser._id.toString());
    res.send(
      `Password Updated Successfully for user : ${loggedInUser.firstName}`
    );
  } catch (err) {
    res.status(400).send('Password Not Updated : ' + err.message);
  }
});

module.exports = { profileRouter };
