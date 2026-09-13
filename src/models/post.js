const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    content: { type: String, required: true, maxLength: 280, trim: true },
    imageUrl: { type: String, maxLength: 2083 },
    mentions: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    likes: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    // populated later by an async AI classification step; null/uncategorized until then
    category: { type: String, default: null },
  },
  { timestamps: true }
);

postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

module.exports = { Post };
