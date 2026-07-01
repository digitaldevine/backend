const express = require("express");

const router = express.Router();

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

const User = require("../Models/user");

const auth = require("../middleware/auth");



router.post("/signup", async (req, res) => {

    try {

        const {

            username,
            email,
            password

        } = req.body;

        const exist = await User.findOne({

            email

        });

        if (exist) {

            return res.json({

                success: false,
                message: "Email already exists"

            });

        }

        const hash = await bcrypt.hash(password, 10);

        const user = await User.create({

            username,
            email,
            password: hash

        });

        const token = jwt.sign(

            { id: user._id },

            process.env.JWT_SECRET,

            {

                expiresIn: "7d"

            }

        );

        res.json({

            success: true,

            token,

            user

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

});



router.post("/signin", async (req, res) => {

    try {

        const {

            email,
            password

        } = req.body;

        const user = await User.findOne({

            email

        });

        if (!user) {

            return res.json({

                success: false,

                message: "User not found"

            });

        }

        const match = await bcrypt.compare(

            password,

            user.password

        );

        if (!match) {

            return res.json({

                success: false,

                message: "Incorrect Password"

            });

        }

        const token = jwt.sign(

            { id: user._id },

            process.env.JWT_SECRET,

            {

                expiresIn: "7d"

            }

        );

        res.json({

            success: true,

            token,

            user

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

});



router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    res.json({
      success: true,
      user
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});



module.exports = router;