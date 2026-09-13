const express = require('express');
const postRouter = express.Router();
const { userAuth } = require('../middlewares/auth');
const { Post } = require('../models/post');
const { resolveMentions } = require('../utils/mentions');
const { cache } = require('../utils/cache');

const USER_PUBLIC_DATA = 'username firstName lastName photoUrl';

postRouter.post('/post', userAuth, async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    if (!content) {
      throw new Error('Post content is required');
    }
    const mentions = await resolveMentions(content);
    const post = new Post({
      authorId: req.user._id,
      content,
      imageUrl,
      mentions,
    });
    await post.save();
    res.json({ message: 'Post Created Successfully', post });
  } catch (err) {
    res.status(400).send('Error : ' + err.message);
  }
});

postRouter.get('/feed', userAuth, async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    page = page < 1 ? 1 : page;
    limit = limit > 50 ? 50 : limit;
    limit = limit < 1 ? 10 : limit;
    const skip = (page - 1) * limit;

    // Feed content is identical for every viewer (global recency, not
    // personalized), so this cache is shared across users, not keyed per-user.
    const cacheKey = `feed:${page}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ message: 'Feed Fetched Successfully', posts: cached });
    }

    // Global recency feed: a brand-new user with zero follows should still see
    // content immediately, not an empty screen telling them to go follow people first.
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'authorId', select: USER_PUBLIC_DATA })
      .lean();

    cache.set(cacheKey, posts);
    res.json({ message: 'Feed Fetched Successfully', posts });
  } catch (err) {
    res.status(400).send('Error : ' + err.message);
  }
});

postRouter.get('/feed/new-count', userAuth, async (req, res) => {
  try {
    const { since } = req.query;
    let count = 0;
    if (since) {
      const sinceDoc = await Post.findById(since).select('createdAt').lean();
      if (sinceDoc) {
        count = await Post.countDocuments({ createdAt: { $gt: sinceDoc.createdAt } });
      }
    }
    res.json({ count });
  } catch (err) {
    res.status(400).send('Error : ' + err.message);
  }
});

postRouter.get('/post/:postId', userAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate({ path: 'authorId', select: USER_PUBLIC_DATA })
      .lean();
    if (!post) {
      throw new Error('Post not Found');
    }
    res.set('Cache-Control', 'private, max-age=60');
    res.json({ message: 'Post Fetched Successfully', post });
  } catch (err) {
    res.status(400).send('Error : ' + err.message);
  }
});

postRouter.delete('/post/:postId', userAuth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.postId, authorId: req.user._id });
    if (!post) {
      throw new Error('Post not Found');
    }
    await post.deleteOne();
    res.json({ message: 'Post Deleted Successfully' });
  } catch (err) {
    res.status(400).send('Error : ' + err.message);
  }
});

postRouter.post('/post/:postId/like', userAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      throw new Error('Post not Found');
    }
    const loggedInUserId = req.user._id;
    const alreadyLiked = post.likes.some((id) => id.equals(loggedInUserId));
    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => !id.equals(loggedInUserId));
    } else {
      post.likes.push(loggedInUserId);
    }
    await post.save();
    res.json({
      message: alreadyLiked ? 'Post Unliked' : 'Post Liked',
      likesCount: post.likes.length,
    });
  } catch (err) {
    res.status(400).send('Error : ' + err.message);
  }
});

module.exports = { postRouter };
