const express = require("express");
const userModel = require("./users");
const productModel = require("./products");
const cartModel = require("./cart");
const discountModel = require("./discount");
const localStrategy = require("passport-local");
const passport = require("passport");
const upload = require("./multer");
// const { user } = require("fontawesome");

const router = express.Router();

// passport.use(new localStrategy(userModel.authenticate()));

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/");
  }
);

// Register route
router.post("/register", async (req, res) => {
  const { username, email, password, fullname, mobile } = req.body;

  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    req.flash('error', 'Email already exists!');
    return res.redirect('/register');
  }

  try {
    const newUser = new userModel({
      username,
      email,
      fullname,
      mobile,
    });

    await userModel.register(newUser, password); // Passport-local-mongoose handles password hashing

    passport.authenticate("local")(req, res, () => {
      req.flash('success', 'Registration successful! Welcome.');
      res.redirect("/");
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error during registration. Please try again.');
    res.redirect('/register');
  }
});

// Login route
router.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login",
})
);

function isAdmin(req, res, next) {
  if (req.user.role === "admin") {
    return next();
  } else {
    res.redirect("/");
  }
}

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

router.get("/", isLoggedIn, async (req, res) => {
  try {
    const successMessage = req.flash("success")[0];
    const user = await userModel.findOne({ _id: req.session.passport.user });
    const products = await productModel.find();

    // Check if a filter parameter is present in the query
    const filter = parseInt(req.query.filter);
    const filteredProducts = filter
      ? products.filter((product) => product.total_rating >= filter)
      : products;

    res.render("index", { user, products: filteredProducts, successMessage });
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

router.get("/login", (req, res) => {
  res.render("login");
});

router.get("/register", async (req, res) => {
  res.render("register");
});

router.get("/admin", isAdmin, async (req, res) => {
  try {
    const userCount = await userModel.countDocuments();
    const productCount = await productModel.countDocuments();
    const allUsers = await userModel.find();
    let totalEarnings = 0;
    allUsers.forEach((user) => {
      user.orders.forEach((order) => {
        totalEarnings += order.totalPrice;
      });
    });
    let totalSales = 0;
    allUsers.forEach((user) => {
      user.orders.forEach((order) => {
        totalSales += order.products.length;
      });
    });
    var mensFashion = 0;
    var womensFashion = 0;
    var kidsFashion = 0;
    var electronics = 0;
    var groceries = 0;
    var furniture = 0;
    // Iterate over each user
    allUsers.forEach((user) => {
      // Iterate over each order of the user
      user.orders.forEach((order) => {
        // Iterate over each product in the order
        order.products.forEach((product) => {
          // Retrieve the category of the product
          const category = product.category;
          // Add the price of the product to the corresponding category variable
          switch (category) {
            case "mensFashion":
              mensFashion += product.price * product.quantity;
              break;
            case "womensFashion":
              womensFashion += product.price * product.quantity;
              break;
            case "kidsFashion":
              kidsFashion += product.price * product.quantity;
              break;
            case "electronics":
              electronics += product.price * product.quantity;
              break;
            case "groceries":
              groceries += product.price * product.quantity;
              break;
            case "furniture":
              furniture += product.price * product.quantity;
              break;
            default:
              // Handle any other category here
              break;
          }
        });
      });
    });
    var mensFashionP = 0;
    var womensFashionP = 0;
    var kidsFashionP = 0;
    var electronicsP = 0;
    var groceriesP = 0;
    var furnitureP = 0;
    // Iterate over each user
    allUsers.forEach((user) => {
      // Iterate over each order of the user
      user.orders.forEach((order) => {
        // Iterate over each product in the order
        order.products.forEach((product) => {
          // Retrieve the category of the product
          const category = product.category;
          // Add the price of the product to the corresponding category variable
          switch (category) {
            case "mensFashion":
              mensFashionP += 1;
              break;
            case "womensFashion":
              womensFashionP += 1;
              break;
            case "kidsFashion":
              kidsFashionP += 1;
              break;
            case "electronics":
              electronicsP += 1;
              break;
            case "groceries":
              groceriesP += 1;
              break;
            case "furniture":
              furnitureP += 1;
              break;
            default:
              // Handle any other category here
              break;
          }
        });
      });
    });
    res.render("admin/admin", {
      userCount,
      productCount,
      totalSales,
      totalEarnings,
      mensFashion,
      womensFashion,
      kidsFashion,
      electronics,
      groceries,
      furniture,
      mensFashionP,
      womensFashionP,
      kidsFashionP,
      electronicsP,
      groceriesP,
      furnitureP,
    }); // Pass userCount as part of an object
  } catch (error) {
    console.error("Error rendering admin page:", error);
    // Handle the error appropriately, such as sending an error response
    res.status(500).send("Error rendering admin page");
  }
});

router.get("/admin/products", isAdmin, (req, res) => {
  res.render("admin/add_products");
});

router.get("/admin/deleteProduct", isAdmin, (req, res) => {
  res.render("admin/delete");
})

router.get("/cart", isLoggedIn, async (req, res) => {
  const username = req.session.passport.user;

  try {
    // Find the user and populate the cart field
    const user = await userModel.findOne({ _id: username }).populate("cart");

    // Check if the user and user.cart exist
    if (!user || !user.cart) {
      return res.render("cart", {
        cartProducts: [],
        products: [],
        cart: null,
        discount: 0,
        code: null,
        contains: null,
      });
    }

    const cartProducts = user.cart;

    // Find the cart associated with the user
    const cart = await cartModel.findOne({ user: username });

    // Check if the cart exists
    if (!cart) {
      return res.render("cart", {
        cartProducts,
        products: [],
        cart: null,
        discount: 0,
        code: null,
        contains: null,
      });
    }

    const products = cart.products;
    const discount = cart.discount;
    const contains = req.query.contains;
    const code = req.query.code;

    res.render("cart", {
      cartProducts,
      products,
      cart,
      discount,
      code,
      contains,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post("/removeCode", async function (req, res) {
  const username = req.session.passport.user;
  const cart = await cartModel.findOne({ user: username });
  cart.discount = 0;
  await cart.save();
  res.redirect("/cart");
});

router.post("/discount", async function (req, res) {
  const discountString = req.body.discount;
  const username = req.session.passport.user;
  const cart = await cartModel.findOne({ user: username });
  const codeArray = await discountModel.findOne();
  const arr = codeArray.code;
  const contains = arr.includes(discountString);
  const discount = parseInt(discountString.slice(4));
  if (arr.includes(discountString)) {
    // Update the discount field in the cart object
    cart.discount = discount;
    await cart.save();
    res.redirect(`/cart?code=${discountString}&contains=${contains}`);
  } else {
    res.redirect(`/cart?contains=${contains}`);
  }
});

router.get("/category/:category", isLoggedIn, async (req, res) => {
  const category = req.params.category;
  const products = await productModel.find();
  const subcategories = await productModel
    .find({ categories: category })
    .distinct("sub_categories");

  res.render("category", { subcategories, category, products });
});

router.get("/category/:category/:subcategory", async function (req, res) {
  const category = req.params.category;
  const subcategory = req.params.subcategory;
  const products = await productModel.find({ sub_categories: subcategory });
  res.render("subcategory", { category, products, subcategory });
});

router.get(
  "/category/:category/:subcategory/:productId",
  isLoggedIn,
  async (req, res) => {
    try {
      const username = req.session.passport.user;
      const productId = req.params.productId;
      const category = req.params.category;
      const product = await productModel.findById(productId);

      // Ensure product is found
      if (!product) {
        return res.status(404).send("Product not found");
      }

      const subcategory = product.sub_categories;
      const rating = product.total_rating;
      const currentUserId = req.session.passport.user;
      const userRatingObj = product.rating.find(
        (ratingObj) => ratingObj.user.toString() === currentUserId.toString()
      );

      let products = null; // Initialize products variable to null

      const cart = await cartModel.findOne({ user: username });
      if (cart && cart.products.length != 0) {
        products = cart.products.find(
          (product) => product.product.toString() === productId
        );
      }

      const userRating = userRatingObj ? userRatingObj.value : null;

      res.render("product", {
        product,
        products,
        category,
        subcategory,
        rating,
        userRating,
      });
    } catch (error) {
      console.error("Error rendering product page:", error);
      // Handle the error appropriately, such as sending an error response
      res.status(500).send("Error rendering the product page");
    }
  }
);


router.post("/searchProducts", async (req, res) => {
  try {
    const payload = req.body.payload.trim();
    const search = await productModel
      .find({ name: { $regex: new RegExp("^" + payload + ".*", "i") } })
      .exec();
    const slicedSearch = search.slice(0, 10);
    res.send({ payload: slicedSearch });
  } catch (error) {
    console.error(error);
    res.status(404).send("Internal Server Error");
  }
});

router.post("/cart/update", async function (req, res) {
  try {
    const userId = req.session.passport.user;
    const productId = req.query.productId;
    const quantity = parseInt(req.body.quantity);
    const cart = await cartModel.findOne({ user: userId });

    if (cart) {
      const productIndex = cart.products.findIndex((product) =>
        product.product.equals(productId)
      );
      if (productIndex !== -1) {
        cart.products[productIndex].quantity = quantity;
        await cart.save();
        res.redirect("/cart");
      } else {
        console.error("Product not found in the cart");
        res.status(404).send("Product not found in the cart");
      }
    } else {
      console.error("Cart not found for the user");
      res.status(404).send("Cart not found for the user");
    }
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/cart/updates", async function (req, res) {
  try {
    const userId = req.session.passport.user;
    const user = await userModel.findOne({ _id: userId });
    const productId = req.query.productId;
    const product = await productModel.findOne({ _id: productId });
    const category = product.categories;
    const subcategory = product.sub_categories;
    const quantity = parseInt(req.body.quantity);

    let cart = await cartModel.findOne({ user: userId });

    if (!cart) {
      // If the user doesn't have a cart, create a new one
      cart = await cartModel.create({
        user: userId,
        products: [
          {
            product: productId,
            quantity: quantity,
            price: product.price,
            name: product.name,
            image: product.image,
          },
        ],
      });
    } else {
      const productIndex = cart.products.findIndex((product) =>
        product.product.equals(productId)
      );

      if (productIndex !== -1) {
        cart.products[productIndex].quantity = quantity;
      } else {
        cart.products.push({
          product: productId,
          price: product.price,
          quantity: quantity,
          name: product.name,
          image: product.image,
        });
      }
      await cart.save();
    }

    // Avoid adding duplicate product IDs to the user's cart array
    if (!user.cart.includes(productId)) {
      user.cart.push(productId);
      await user.save();
    }

    res.redirect(`/category/${category}/${subcategory}/${productId}`);
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).send("Error updating cart");
  }
});


router.get("/orders", isLoggedIn, async (req, res) => {
  res.render("orders");
});

router.post("/proceedToPayment", isLoggedIn, async (req, res) => {
  try {
    const username = req.session.passport.user;
    const cart = await cartModel
      .findOne({ user: username })
      .populate("products.product");
    const user = await userModel.findOne({ _id: username });

    // Calculate total price
    let totalPrice = 0;
    cart.products.forEach((product) => {
      totalPrice += product.price * product.quantity;
    });

    // Apply discount if available
    const discount = cart.discount;
    if (discount > 0) {
      totalPrice -= discount;
    }

    // Create an order object
    const order = {
      products: cart.products.map((product) => ({
        productId: product.product._id,
        price: product.price,
        category: product.product.categories,
        quantity: product.quantity,
      })),
      discount: discount,
      totalPrice: totalPrice,
      createdAt: new Date(),
    };

    // Push the order object to the user's orders array
    user.orders.push(order);
    await user.save();

    // Clear the user's cart after placing the order
    cart.products = [];
    cart.discount = 0;
    await cart.save();

    user.cart = [];
    await user.save();

    res.redirect("/orders"); // Redirect to orders page or any other desired page
  } catch (error) {
    console.error("Error proceeding to payment:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/sort", async (req, res) => {
  try {
    const username = req.session.passport.user;
    const filter = req.body.filter;
    const cart = await cartModel
      .findOne({ user: username })
      .populate("products.product");
    if (filter === "ascending") {
      cart.products.sort((a, b) => a.product.price - b.product.price);
    } else if (filter === "descending") {
      cart.products.sort((a, b) => b.product.price - a.product.price);
    }
    await cart.save();
    res.redirect("/cart");
  } catch (error) {
    console.error("Error sorting products:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/filter", async function (req, res) {
  try {
    const selectedFilter = parseInt(req.body.filter);

    // Validate the selected filter
    if (isNaN(selectedFilter) || selectedFilter < 1 || selectedFilter > 5) {
      return res.status(400).send("Invalid filter value");
    }

    // Find products with a total rating greater than or equal to the selected filter
    const filteredProducts = await productModel.find({
      total_rating: { $gte: selectedFilter },
    });

    // You can render the filteredProducts in your view or send it as JSON, depending on your needs
    res.redirect(`/?filter=${selectedFilter}`);
  } catch (error) {
    console.error("Error in filter route:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/deleteProduct", isAdmin, async (req, res) => {
  let payload = req.body.payload.trim();
  let search = await productModel.find({ name: { $regex: new RegExp('^' + payload + '.*', 'i') } }).exec()
  search = search.slice(0, 10)
  res.send({ payload: search })
})

router.post("/cart/delete", isLoggedIn, async (req, res) => {
  const productId = req.body.productId;
  const username = req.session.passport.user;

  try {
    // Remove the product from the cartModel
    await cartModel.findOneAndUpdate(
      { user: username },
      { $pull: { products: { product: productId } } },
      { new: true }
    );

    // Remove the product from the userModel
    const user = await userModel.findOne({ _id: username });

    // Find the index of the product to remove
    const index = user.cart.findIndex(
      (cartProductId) => cartProductId.toString() === productId
    );

    // Remove the product from the cart array
    if (index !== -1) {
      user.cart.splice(index, 1);
    }

    await user.save();

    res.redirect("/cart");
  } catch (error) {
    console.error("Error deleting product from cart:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/rating", async function (req, res) {
  const category = req.body.category;
  const subcategory = req.body.subcategory;
  const productId = req.body.productId;
  const username = req.session.passport.user;
  const user = await userModel.findOne({ _id: username });
  const rating = parseInt(req.body.rating);
  const product = await productModel.findOne({ _id: productId });
  const existingRatingIndex = product.rating.findIndex((r) =>
    r.user.equals(user._id)
  );
  if (existingRatingIndex !== -1) {
    product.rating[existingRatingIndex].value = rating;
  } else {
    product.rating.push({
      user: user._id,
      value: rating,
    });
  }
  const totalRating = product.rating.reduce(
    (sum, rating) => sum + rating.value,
    0
  );
  product.total_rating =
    product.rating.length > 0 ? totalRating / product.rating.length : 0;
  await product.save();
  res.redirect(`/category/${category}/${subcategory}/${productId}`);
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No files were uploaded");
    }

    const product = await productModel.create({
      image: req.file.filename,
      name: req.body.name,
      price: req.body.price,
      categories: req.body.category,
      sub_categories: req.body.subcategory,
    });

    await product.save();
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
});

module.exports = router;
