const mongoose = require("mongoose");
const plm = require("passport-local-mongoose");

mongoose.connect("mongodb+srv://tathyashah1130:darket1826@cluster0.xrvdy9i.mongodb.net/");

const userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: String,
  email: { type: String, required: true, unique: true },
  fullname: String,
  mobile: Number,
  cart: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "products",
      },
    },
  ],
  orders: [
    {
      products: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "products",
            required: true,
          },
          price: {
            type: Number,
            required: true,
          },
          category: {
            type: String,
            ref: "products",
          },
          quantity: {
            type: Number,
            default: 1,
            ref: "products",
          },
        },
      ],
      discount: {
        type: Number,
        default: 0,
      },
      totalPrice: {
        type: Number,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
      },
    },
  ],
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
  profile: {
    type: String,
    default: '/images/default-avatar.png'
  }
});

userSchema.plugin(plm, { usernameField: 'email' });

module.exports = mongoose.model("user", userSchema);
