const express = require("express");
const { check, validationResult } = require("express-validator");
const bcrypt = require('bcryptjs');

const { loginUser, logoutUser } = require('../auth')
const db = require("../db/models");
const { csrfProtection, asyncHandler } = require("./utils");

const router = express.Router();

router.get("/user/register", csrfProtection, (req, res) => {
  const user = db.User.build();
  res.render("user-register", {
    title: "Register",
    user,
    csrfToken: req.csrfToken(),
  });
});

const userValidators = [
  check("firstName")
    .exists({ checkFalsy: true })
    .withMessage("Please provide a value for First Name")
    .isLength({ max: 50 })
    .withMessage("First Name must not be more than 50 characters long"),
  check("lastName")
    .exists({ checkFalsy: true })
    .withMessage("Please provide a value for Last Name")
    .isLength({ max: 50 })
    .withMessage("Last Name must not be more than 50 characters long"),
  check("emailAddress")
    .exists({ checkFalsy: true })
    .withMessage("Please provide a value for Email Address")
    .isLength({ max: 255 })
    .withMessage("Email Address must not be more than 255 characters long")
    .isEmail()
    .withMessage("Email Address is not a valid email"),
  check("password")
    .exists({ checkFalsy: true })
    .withMessage("Please provide a value for Password")
    .isLength({ max: 50 })
    .withMessage("Password must not be more than 50 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, 'g')
    .withMessage('Password must contain at least 1 lowercase letter, uppercase letter, number, and special character (i.e. "!@#$%^&*")'),
  check("confirmPassword")
    .exists({ checkFalsy: true })
    .withMessage("Please provide a value for Confirm Password")
    .isLength({ max: 50 })
    .withMessage("Confirm Password must not be more than 50 characters long")
    .custom((value, { req }) => {
        if (value !== req.body.password) {
            throw newError('Confirm Password does not match Password');
        }
        return true;
    })
];

router.post(
  "/user/register",
  csrfProtection,
  userValidators,
  asyncHandler(async (req, res) => {
    const { emailAddress, firstName, lastName, password } = req.body;

    const user = db.User.build({
      emailAddress,
      firstName,
      lastName,
    });

    const validatorErrors = validationResult(req);

    if (validatorErrors.isEmpty()) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.hashedPassword = hashedPassword;
      await user.save();
      loginUser(req, res, user);
      res.redirect("/");
    } else {
      const errors = validatorErrors.array().map((error) => error.msg);

      res.render("user-register", {
        title: "Register",
        user,
        errors,
        csrfToken: req.csrfToken(),
      });
    }
  })
);

router.get('/user/login', csrfProtection, (req, res) => {
    res.render('user-login', {
      title: 'Login',
      csrfToken: req.csrfToken(),
    });
  });
  
  const loginValidators = [
    check('emailAddress')
      .exists({ checkFalsy: true })
      .withMessage('Please provide a value for Email Address'),
    check('password')
      .exists({ checkFalsy: true })
      .withMessage('Please provide a value for Password'),
  ];
  
  router.post('/user/login', csrfProtection, loginValidators,
    asyncHandler(async (req, res) => {
      const {
        emailAddress,
        password,
      } = req.body;
  
      let errors = [];
      const validatorErrors = validationResult(req);
  
      if (validatorErrors.isEmpty()) {
        const user = await db.User.findOne({ where: { emailAddress }})
        if(user) {
            const passwordMatch = await bcrypt.compare(password, user.hashedPassword.toString())

            if(passwordMatch) {
                //login user etc.
                loginUser(req, res, user);
                return res.redirect('/')
            }
        }
        errors.push('Login failed for the provided email and password')
      } else {
        errors = validatorErrors.array().map((error) => error.msg);
      }
  
      res.render('user-login', {
        title: 'Login',
        emailAddress,
        errors,
        csrfToken: req.csrfToken(),
      });
    }));

    router.post('/user/logout', (req, res) => {
        logoutUser(req, res);
        res.redirect('/user/login');
    })

module.exports = router;
