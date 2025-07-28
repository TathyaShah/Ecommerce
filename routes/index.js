const express = require("express");
const userModel = require("./users");
const productModel = require("./products");
const cartModel = require("./cart");
const discountModel = require("./discount");
const localStrategy = require("passport-local");
const passport = require("passport");
const upload = require("./multer");
const nodemailer = require('nodemailer');
const fetch = require('node-fetch'); // Add at the top
// const { user } = require("fontawesome");

const router = express.Router();

passport.use(new localStrategy(userModel.authenticate()));

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
    const emailExists = "This email is already linked with an account. Please login";
    return res.redirect(`/login?message=${emailExists}`);
  }
  try {
    const newUser = new userModel({
      username,
      email,
      fullname,
      mobile,
      profile: '/images/default-avatar.png',
    });

    await userModel.register(newUser, password); // Passport-local-mongoose handles password hashing

    passport.authenticate("local")(req, res, () => {
      const successRegistration = "Registration successful";
      res.redirect(`/?message=${successRegistration}`);
    });
  } catch (error) {
    console.error(error);
    const failRegistration = "Error during registration. Please try again.";
    res.redirect(`/register?message=${failRegistration}`);
  }
});

// Login route
router.post("/login", async (req, res, next) => {
  const { email } = req.body;
  const user = await userModel.findOne({ email });
  const LF = "Invalid email or password";
  if (!user) {
    // User not found, redirect to register with message
    return res.redirect('/register?message=' + encodeURIComponent("Username is not associated with this email. Try registering"));
  }
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: `/login?message=${LF}`,
  })(req, res, next);
});

function isAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  res.redirect("/");
}

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

router.get("/", async (req, res) => {
  try {
    const user = req.isAuthenticated() ? await userModel.findOne({ _id: req.session.passport.user }) : null;
    const products = await productModel.find();

    // Check if a filter parameter is present in the query
    const filter = parseInt(req.query.filter);
    const filteredProducts = filter
      ? products.filter((product) => product.total_rating >= filter)
      : products;

    // Fetch the user's cart and get the products in the cart if logged in
    let cartProducts = [];
    if (req.isAuthenticated()) {
      const cart = await cartModel.findOne({ user: user._id });
      if (cart) {
        cartProducts = cart.products.map((p) => p.product.toString());
      }
    }

    res.render("index", {
      user,
      products: filteredProducts,
      cartProducts, // Pass the cart products to the view
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('404', { message: 'Internal Server Error' });
  }
});

router.get("/login", (req, res) => {
  res.render("login");
});

router.get("/register", async (req, res) => {
  res.render("register");
});

router.get('/account', isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ _id: req.session.passport.user });
  res.render('account', { user });
});

router.get('/faq', (req, res) => {
  res.render('faq');
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
    const adminPageFailed = "AF";
    res.redirect(`/?message=${adminPageFailed}`)
  }
});

router.get("/admin/products", isAdmin, async (req, res) => {
  try {
    const products = await productModel.find();
    res.render("admin/products", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).render("404", { message: "Error fetching products" });
  }
});

router.get("/admin/deleteProduct", isAdmin, (req, res) => {
  res.render("admin/delete");
})

router.post('/admin/products/delete/:id', isAdmin, async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.params.id);
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).render('404', { message: 'Error deleting product' });
  }
});

router.get("/admin/users", isAdmin, async (req, res) => {
  try {
    let users = await userModel.find();
    const { sort, order } = req.query;
    if (sort) {
      users = users.sort((a, b) => {
        let aValue, bValue;
        switch (sort) {
          case 'fullname':
            aValue = a.fullname || '';
            bValue = b.fullname || '';
            break;
          case 'email':
            aValue = a.email || '';
            bValue = b.email || '';
            break;
          case 'username':
            aValue = a.username || '';
            bValue = b.username || '';
            break;
          case 'mobile':
            aValue = a.mobile || '';
            bValue = b.mobile || '';
            break;
          case 'role':
            aValue = a.role || '';
            bValue = b.role || '';
            break;
          case 'orders':
            aValue = a.orders ? a.orders.length : 0;
            bValue = b.orders ? b.orders.length : 0;
            break;
          case 'totalSpent':
            aValue = a.orders ? a.orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0) : 0;
            bValue = b.orders ? b.orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0) : 0;
            break;
          default:
            aValue = '';
            bValue = '';
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return order === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        } else {
          return order === 'desc' ? bValue - aValue : aValue - bValue;
        }
      });
    }
    res.render('admin/users', { users, sort, order });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).render('404', { message: 'Error fetching users' });
  }
});

// Admin delete user route
router.post('/admin/users/delete/:id', isAdmin, async (req, res) => {
  try {
    await userModel.findByIdAndDelete(req.params.id);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).render('404', { message: 'Error deleting user' });
  }
});

// Admin update user role route
router.post('/admin/users/role/:id', isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    await userModel.findByIdAndUpdate(req.params.id, { role });
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).render('404', { message: 'Error updating user role' });
  }
});

// Admin orders route
router.get("/admin/orders", isAdmin, async (req, res) => {
  try {
    const allUsers = await userModel.find().populate('orders.products.productId');
    const { sort, order, status } = req.query;

    // Collect all orders from all users
    let allOrders = [];
    allUsers.forEach(user => {
      user.orders.forEach(order => {
        allOrders.push({
          ...order.toObject(),
          userId: user._id,
          userEmail: user.email,
          userFullname: user.fullname || user.username,
          userMobile: user.mobile
        });
      });
    });

    // Apply status filter if provided
    if (status && status !== 'all') {
      allOrders = allOrders.filter(order => order.status === status);
    }

    // Apply sorting
    if (sort) {
      allOrders.sort((a, b) => {
        let aValue, bValue;
        switch (sort) {
          case 'orderId':
            aValue = a._id.toString();
            bValue = b._id.toString();
            break;
          case 'customer':
            aValue = a.userFullname || '';
            bValue = b.userFullname || '';
            break;
          case 'email':
            aValue = a.userEmail || '';
            bValue = b.userEmail || '';
            break;
          case 'totalPrice':
            aValue = a.totalPrice || 0;
            bValue = b.totalPrice || 0;
            break;
          case 'items':
            aValue = a.products ? a.products.length : 0;
            bValue = b.products ? b.products.length : 0;
            break;
          case 'date':
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
          case 'status':
            aValue = a.status || 'pending';
            bValue = b.status || 'pending';
            break;
          default:
            aValue = '';
            bValue = '';
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return order === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        } else {
          return order === 'desc' ? bValue - aValue : aValue - bValue;
        }
      });
    }

    // Calculate statistics
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const pendingOrders = allOrders.filter(order => !order.status || order.status === 'pending').length;
    const completedOrders = allOrders.filter(order => order.status === 'completed').length;
    const cancelledOrders = allOrders.filter(order => order.status === 'cancelled').length;
    const totalItems = allOrders.reduce((sum, order) => sum + (order.products ? order.products.length : 0), 0);

    // Category-wise revenue
    const categoryRevenue = {
      mensFashion: 0,
      womensFashion: 0,
      kidsFashion: 0,
      electronics: 0,
      groceries: 0,
      furniture: 0
    };

    allOrders.forEach(order => {
      order.products.forEach(product => {
        const category = product.category;
        if (categoryRevenue.hasOwnProperty(category)) {
          categoryRevenue[category] += (product.price * product.quantity);
        }
      });
    });

    res.render('admin/orders', {
      orders: allOrders,
      sort,
      order,
      status,
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalItems,
      categoryRevenue
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).render('404', { message: 'Error fetching orders' });
  }
});

// Admin update order status route
router.post('/admin/orders/status/:orderId', isAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Find the user who has this order
    const user = await userModel.findOne({ 'orders._id': orderId });
    if (!user) {
      return res.status(404).render('404', { message: 'Order not found' });
    }

    // Update the order status
    const orderIndex = user.orders.findIndex(order => order._id.toString() === orderId);
    if (orderIndex !== -1) {
      user.orders[orderIndex].status = status;
      await user.save();
    }

    res.redirect('/admin/orders');
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).render('404', { message: 'Error updating order status' });
  }
});

// Admin delete order route
router.post('/admin/orders/delete/:orderId', isAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find the user who has this order
    const user = await userModel.findOne({ 'orders._id': orderId });
    if (!user) {
      return res.status(404).render('404', { message: 'Order not found' });
    }

    // Remove the order
    user.orders = user.orders.filter(order => order._id.toString() !== orderId);
    await user.save();

    res.redirect('/admin/orders');
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).render('404', { message: 'Error deleting order' });
  }
});

router.get("/cart", isLoggedIn, async (req, res) => {
  try {
    const username = req.session.passport.user;
    const cart = await cartModel.findOne({ user: username });

    if (!cart || !cart.products.length) {
      return res.render("cart", {
        cartProducts: [], // Empty cartProducts array
        products: [], // Empty products array
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
      cartProducts: products, // Pass cart products
      products, // Same products array
      cart,
      discount,
      code,
      contains,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).render('404', { message: 'Internal Server Error' });
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

// Everyone can access the category page
router.get("/category/:category", async (req, res) => {
  const category = req.params.category;
  const products = await productModel.find();
  const subcategories = await productModel
    .find({ categories: category })
    .distinct("sub_categories");

  res.render("category", { subcategories, category, products });
});

// Everyone can access the subcategory page
router.get("/category/:category/:subcategory", async function (req, res) {
  const category = req.params.category;
  const subcategory = req.params.subcategory;
  const products = await productModel.find({ sub_categories: subcategory });
  res.render("subcategory", { category, products, subcategory });
});


router.get("/category/:category/:subcategory/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    const category = req.params.category;
    const product = await productModel.findById(productId);

    // Ensure product is found
    if (!product) {
      return res.status(404).render('404', { message: 'Product not found' });
    }

    const subcategory = product.sub_categories;
    const rating = product.total_rating;
    const currentUserId = req.session.passport?.user || null;
    const userRatingObj = product.rating.find(
      (ratingObj) => currentUserId && ratingObj.user.toString() === currentUserId.toString()
    );

    let products = null; // Initialize products variable to null

    if (currentUserId) {
      const cart = await cartModel.findOne({ user: currentUserId });
      if (cart && cart.products.length != 0) {
        products = cart.products.find(
          (product) => product.product.toString() === productId
        );
      }
    }

    const userRating = userRatingObj ? userRatingObj.value : null;

    res.render("product", {
      product,
      products,
      category,
      subcategory,
      rating,
      userRating,
      isLoggedIn: !!currentUserId
    });
  } catch (error) {
    console.error("Error rendering product page:", error);
    res.status(500).render('404', { message: 'Error rendering the product page' });
  }
});



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
    res.status(404).render('404', { message: 'Internal Server Error' });
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
        res.status(404).render('404', { message: 'Product not found in the cart' });
      }
    } else {
      console.error("Cart not found for the user");
      res.status(404).render('404', { message: 'Cart not found for the user' });
    }
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).render('404', { message: 'Internal Server Error' });
  }
});

router.post("/category/:categories/:sub_categories/:_id", isLoggedIn, async function (req, res) {
  try {
    const userId = req.session.passport.user;
    const productId = req.params._id;
    const product = await productModel.findOne({ _id: productId });
    const quantity = 1; // Default quantity is 1

    let cart = await cartModel.findOne({ user: userId });

    if (!cart) {
      cart = await cartModel.create({
        user: userId,
        products: [{
          product: productId,
          quantity,
          price: product.price,
          name: product.name,
          image: product.image,
        }],
      });
    } else {
      const productIndex = cart.products.findIndex((product) =>
        product.product.equals(productId)
      );

      if (productIndex !== -1) {
        cart.products[productIndex].quantity += quantity;
      } else {
        cart.products.push({
          product: productId,
          price: product.price,
          quantity,
          name: product.name,
          image: product.image,
        });
      }
      await cart.save();
    }

    res.redirect("/?message=ATC"); // Show message when added to cart
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).render('404', { message: 'Internal Server Error' });
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
    res.status(500).render('404', { message: 'Error updating cart' });
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
        name: product.product.name,
      })),
      discount: discount,
      totalPrice: totalPrice,
      createdAt: new Date(),
    };

    // Push the order object to the user's orders array
    user.orders.push(order);
    await user.save();

    // Send order confirmation email
    // Set up nodemailer transporter (use your real SMTP config in production)
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });

    // Build order details HTML (modern, clean UI)
    let orderItemsHtml = order.products.map(p =>
      `<tr>
        <td style='padding:10px 8px; border-bottom:1px solid #e5e7eb;'>${p.name}</td>
        <td style='padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:center;'>${p.quantity}</td>
        <td style='padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right;'>₹${p.price}</td>
        <td style='padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right;'>₹${p.price * p.quantity}</td>
      </tr>`
    ).join('');

    let html = `
      <div style="background:#f4f8fb;padding:32px 0;min-height:100vh;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 2px 12px #0001;padding:32px 24px;">
          <div style="text-align:center;margin-bottom:24px;">
            <img src='https://cdn-icons-png.flaticon.com/512/3500/3500833.png' alt='Order Confirmed' style='width:64px;height:64px;margin-bottom:8px;'/>
            <h2 style="color:#2563eb;font-size:1.5rem;margin:0 0 8px 0;">Thank you for your order, ${user.fullname || user.username}!</h2>
            <p style="color:#64748b;font-size:1rem;margin:0;">Your order has been placed successfully.</p>
          </div>
          <div style="margin-bottom:24px;">
            <h3 style="color:#0f172a;font-size:1.1rem;margin-bottom:8px;">Order Details</h3>
            <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#e0e7ef;color:#2563eb;">
                  <th style="padding:10px 8px;text-align:left;font-size:0.98rem;">Product</th>
                  <th style="padding:10px 8px;text-align:center;font-size:0.98rem;">Qty</th>
                  <th style="padding:10px 8px;text-align:right;font-size:0.98rem;">Price</th>
                  <th style="padding:10px 8px;text-align:right;font-size:0.98rem;">Subtotal</th>
                </tr>
              </thead>
              <tbody>${orderItemsHtml}</tbody>
            </table>
          </div>
          <div style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;color:#334155;font-size:1rem;margin-bottom:4px;">
              <span>Discount:</span>
              <span>₹${order.discount || 0}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:bold;color:#2563eb;font-size:1.1rem;">
              <span>Total:</span>
              <span>₹${order.totalPrice}</span>
            </div>
          </div>
          <div style="color:#64748b;font-size:0.98rem;margin-bottom:8px;">
            <strong>Order Date:</strong> ${order.createdAt.toLocaleString()}
          </div>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:0.95rem;margin-top:32px;">If you have any questions, reply to this email.<br>Thank you for shopping with us!</p>
      </div>
    `;

    await transporter.sendMail({
      from: 'no-reply@ecommerce.com',
      to: user.email,
      subject: 'Order Confirmation',
      html
    });

    // Clear the user's cart after placing the order
    cart.products = [];
    cart.discount = 0;
    await cart.save();

    user.cart = [];
    await user.save();

    res.redirect("/orders"); // Redirect to orders page or any other desired page
  } catch (error) {
    console.error("Error proceeding to payment:", error);
    res.status(500).render('404', { message: 'Internal Server Error' });
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
    res.status(500).render('404', { message: 'Internal Server Error' });
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
    res.status(500).render('404', { message: 'Internal Server Error' });
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
    const deleteProduct = "DP";
    res.redirect(`/cart?message=${deleteProduct}`);
  } catch (error) {
    console.error("Error deleting product from cart:", error);
    res.status(500).render('404', { message: 'Internal Server Error' });
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
      stock: req.body.stock || 0
    });

    await product.save();
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.status(500).render('404', { message: 'Internal Server Error' });
  }
});

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// Admin update stock route
router.post('/admin/update-stock', isAdmin, async (req, res) => {
  try {
    const { productId, newStock } = req.body;
    if (!productId || typeof newStock === 'undefined') {
      return res.status(400).json({ success: false, message: 'Missing productId or newStock' });
    }
    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    product.stock = newStock;
    await product.save();
    res.json({ success: true, message: 'Stock updated successfully', stock: product.stock });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delivery time estimator route
router.post('/cart/delivery-time', async (req, res) => {
  try {
    // Support both AJAX and form POST
    let pincode = req.body.pincode;
    let cartItems = req.body.cartItems;
    // If cartItems is an array of JSON strings (from form), parse each
    if (Array.isArray(cartItems)) {
      cartItems = cartItems.map(item => typeof item === 'string' ? JSON.parse(item) : item);
    } else if (typeof cartItems === 'string') {
      try { cartItems = JSON.parse(cartItems); } catch (e) { cartItems = []; }
    }
    if (!pincode || !cartItems || !Array.isArray(cartItems)) {
      return res.status(400).render('cart', { ...req.app.locals, deliveryResults: [{ message: 'Missing pincode or cart items.' }] });
    }
    // Validate pincode using India Post API
    let cityName = null;
    let apiError = null;
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      if (data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
        cityName = data[0].PostOffice[0].District;
      } else {
        apiError = 'Invalid or unsupported pincode entered.';
      }
    } catch (err) {
      apiError = 'Could not validate pincode. Please try again.';
    }
    if (!cityName) {
      // Invalid pincode
      const userId = req.session.passport.user;
      const cart = await cartModel.findOne({ user: userId });
      const products = cart ? cart.products : [];
      const discount = cart ? cart.discount : 0;
      const contains = null;
      const code = null;
      return res.render('cart', { ...req.app.locals, cart, products, cartProducts: products, deliveryResults: [{ message: apiError }], maxDeliveryTimeString: null, cityName: null, discount, contains, code });
    }
    const warehousePincode = 400001;
    const results = [];
    let maxDeliveryTimeInHours = 0;
    let maxDeliveryTimeString = '';
    for (const item of cartItems) {
      const product = await productModel.findById(item.productId);
      if (!product) {
        results.push({ productId: item.productId, status: 'not_found', message: 'Product not found' });
        continue;
      }
      if (product.stock === 0) {
        results.push({ productId: item.productId, status: 'out_of_stock', name: product.name, message: `Item ${product.name} is out of stock` });
        continue;
      }
      // New formula: greater delivery time
      const deliveryTimeInHours = Math.abs(Number(pincode) - warehousePincode) % 48 + 24; // 1-2 days minimum
      if (deliveryTimeInHours > maxDeliveryTimeInHours) maxDeliveryTimeInHours = deliveryTimeInHours;
      const days = Math.floor(deliveryTimeInHours / 24);
      const hours = deliveryTimeInHours % 24;
      const deliveryTime = `${days > 0 ? days + ' days ' : ''}${hours} hours`;
      results.push({ productId: item.productId, status: 'ok', name: product.name, deliveryTime });
    }
    if (maxDeliveryTimeInHours > 0) {
      const days = Math.floor(maxDeliveryTimeInHours / 24);
      const hours = maxDeliveryTimeInHours % 24;
      maxDeliveryTimeString = `${days > 0 ? days + ' days ' : ''}${hours} hours`;
    }
    // If AJAX, respond with JSON. If form, render cart.ejs with deliveryResults.
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true, results });
    } else {
      // Re-fetch cart and products for rendering
      const userId = req.session.passport.user;
      const cart = await cartModel.findOne({ user: userId });
      const products = cart ? cart.products : [];
      const discount = cart ? cart.discount : 0;
      const contains = null;
      const code = null;
      res.render('cart', { ...req.app.locals, cart, products, cartProducts: products, deliveryResults: results, maxDeliveryTimeString, cityName, discount, contains, code });
    }
  } catch (error) {
    console.error('Error estimating delivery time:', error);
    res.status(500).render('cart', { ...req.app.locals, deliveryResults: [{ message: 'Internal server error' }] });
  }
});

module.exports = router;
