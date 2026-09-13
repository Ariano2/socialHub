const express = require('express');
const userRouter = express.Router();
const { userAuth } = require('../middlewares/auth');
const { User } = require('../models/user');
const { Follow } = require('../models/follow');
const { cache } = require('../utils/cache');

const USER_PUBLIC_DATA = 'username firstName lastName photoUrl interests about';
const USER_PUBLIC_FIELDS = {
  username: 1,
  firstName: 1,
  lastName: 1,
  photoUrl: 1,
  interests: 1,
  about: 1,
};

userRouter.get('/user/discover', userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    page = page < 1 ? 1 : page;
    limit = limit > 50 ? 50 : limit;
    limit = limit < 1 ? 10 : limit;
    const skip = (page - 1) * limit;

    const cacheKey = `discover:${loggedInUser._id}:${page}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ message: 'Users Fetched Successfully', users: cached });
    }

    const following = await Follow.find({ followerId: loggedInUser._id }).select('followingId');
    const excludeIds = following.map((f) => f.followingId);
    excludeIds.push(loggedInUser._id);

    // Rank by shared interests overlap with the logged-in user, jittered by
    // randomFactor so ties (the common zero-overlap case early on) don't
    // default to Mongo's natural/insertion order.
    const mySignals = loggedInUser.interests || [];
    const users = await User.aggregate([
      { $match: { _id: { $nin: excludeIds } } },
      {
        $addFields: {
          overlapScore: {
            $size: { $setIntersection: [{ $ifNull: ['$interests', []] }, mySignals] },
          },
          randomFactor: { $rand: {} },
        },
      },
      { $addFields: { rankScore: { $add: [{ $multiply: ['$overlapScore', 10] }, '$randomFactor'] } } },
      { $sort: { rankScore: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: USER_PUBLIC_FIELDS },
    ]);

    cache.set(cacheKey, users);
    res.json({ message: 'Users Fetched Successfully', users });
  } catch (err) {
    res.status(400).send('Error : ' + err.message);
  }
});

userRouter.get('/user/:username', userAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select(USER_PUBLIC_DATA)
      .lean();
    if (!user) {
      throw new Error('User not Found');
    }
    res.set('Cache-Control', 'private, max-age=60');
    res.json({ message: 'User Fetched Successfully', user });
  } catch (err) {
    res.status(400).send('Error : ' + err.message);
  }
});

module.exports = { userRouter };
