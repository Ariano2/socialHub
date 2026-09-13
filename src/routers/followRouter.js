const express = require('express');
const followRouter = express.Router();
const { userAuth } = require('../middlewares/auth');
const { Follow } = require('../models/follow');
const { User } = require('../models/user');

const USER_PUBLIC_DATA = 'username firstName lastName photoUrl interests about';

followRouter.post('/follow/:userId', userAuth, async (req, res) => {
  try {
    const followerId = req.user._id;
    const { userId: followingId } = req.params;
    const userToFollow = await User.findById(followingId);
    if (!userToFollow) {
      throw new Error('User does not Exist');
    }
    try {
      const follow = new Follow({ followerId, followingId });
      await follow.save();
      res.json({ message: 'Followed Successfully', follow });
    } catch (err) {
      if (err.code === 11000) {
        return res.json({ message: 'Already Following' });
      }
      throw err;
    }
  } catch (err) {
    res.status(400).send('Error : ' + err.message);
  }
});

followRouter.delete('/follow/:userId', userAuth, async (req, res) => {
  try {
    const followerId = req.user._id;
    const { userId: followingId } = req.params;
    await Follow.findOneAndDelete({ followerId, followingId });
    res.json({ message: 'Unfollowed Successfully' });
  } catch (err) {
    res.status(400).send('Error : ' + err.message);
  }
});

followRouter.get('/follow/followers', userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const followers = await Follow.find({ followingId: loggedInUser._id })
      .populate({ path: 'followerId', select: USER_PUBLIC_DATA })
      .lean();
    res.json({
      message: 'Followers Fetched Successfully',
      followers: followers.map((f) => f.followerId),
    });
  } catch (err) {
    res.status(400).send('Error : ' + err.message);
  }
});

followRouter.get('/follow/following', userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const following = await Follow.find({ followerId: loggedInUser._id })
      .populate({ path: 'followingId', select: USER_PUBLIC_DATA })
      .lean();
    res.json({
      message: 'Following Fetched Successfully',
      following: following.map((f) => f.followingId),
    });
  } catch (err) {
    res.status(400).send('Error : ' + err.message);
  }
});

module.exports = { followRouter };
