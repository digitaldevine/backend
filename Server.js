const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const mongoose = require("mongoose");

dotenv.config();
const authRoutes = require("./Routes/auth");
const auth = require("./middleware/auth");
const User = require("./Models/user");

const app = express();

app.use(cors());
require("dotenv").config();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)

  .then(() => {

    console.log("MongoDB Connected");

  })

  .catch(err => {

    console.log(err);

  });



app.use("/api/auth", authRoutes);



app.get("/", (req, res) => {

  res.send("Backend Running");

});





const languageMap = {
  python: { language: "python3", versionIndex: "4" },
  java: { language: "java", versionIndex: "5" },
  cpp: { language: "cpp17", versionIndex: "1" },
  javascript: { language: "nodejs", versionIndex: "4" },
  php: { language: "php", versionIndex: "4" }
};

app.post("/api/code/run", auth, async (req, res) => {
  try {
    const { code, language, questionId, input } = req.body;

    const config = languageMap[language];

    if (!config) {
      return res.status(400).json({
        success: false,
        message: "Unsupported language"
      });
    }

    const response = await axios.post(
      "https://api.jdoodle.com/v1/execute",
      {
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
        script: code,
        language: config.language,
        versionIndex: config.versionIndex,
        stdin: input || ""
      }
    );

    const output = response.data.output || "";

    // JDoodle returns compile/runtime errors inside output
    const error =
      output.toLowerCase().includes("error") ||
        output.toLowerCase().includes("exception")
        ? output
        : "";

    const passed = !error;

    let alreadySolved = false;

    if (passed) {
      const user = await User.findById(req.user.id);

      if (user && questionId) {
        const isAlreadySolved = user.solvedList.includes(questionId);

        if (!isAlreadySolved) {
          user.score += 10;
          user.solvedList.push(questionId);
          await user.save();
        } else {
          alreadySolved = true;
        }
      }
    }

    return res.json({
      success: true,
      output,
      error,
      isCorrect: passed,
      alreadySolved
    });

  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      success: false,
      message: "Execution failed"
    });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {

    const users = await User.find(
      {},
      {
        username: 1,
        score: 1
      }
    ).sort({ score: -1 });

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      name: user.username,
      score: user.score
    }));

    res.json({
      success: true,
      users: leaderboard
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Failed to load leaderboard"
    });
  }
});



app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server Listening On Port ${PORT}`);
});