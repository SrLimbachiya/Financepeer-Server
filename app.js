const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const app = express();
app.use(express.json());

app.use(cors({
  origin: '*'
}));
let db;
const dbPath = path.join(__dirname, "./Financepeer.db");

// Database Init Function
const initFunc = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(7747, () => {
      console.log("Server Started");
    });
  } catch (error) {
    console.log(error.message);
  }
};

initFunc();

// JWT Authorization middleware function
const checkToken = (req, res, nxt) => {
  let jwtToken;
  const authHeader = req.headers.authorization;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "Magic", async (error, payload) => {
      if (error) {
        res.status(401);
        res.send("Invalid JWT Token");
      } else {
        nxt();
      }
    });
  }
};

// API 1 - user login
app.post("/login/",  async (req, res) => {
  const { username, password } = req.body;
  const isUser = await db.get(`
  select * from user where username = '${username}'
  `);
  if (isUser === undefined) {
    res.status(400);
    res.send({ error_msg: "Invalid username" });
  } else {
    if (await bcrypt.compare(password, isUser.password)) {
      let payload = { username: username, fullname : isUser.full_name };
      console.log(`${username} is logged in`);
      let jwt_token = jwt.sign(payload, "Magic");
      res.send({ jwt_token });
      res.status(200);
    } else {
      res.status(400);
      res.send({ error_msg: "Invalid password" });
    }
  }
});


app.get('/get-user' , async (req,res) => {
  const header = (req.headers.authorization)
  const myToken = header.split(' ')[1]
  jwt.verify(myToken, "Magic", (error, decodedToken) => {
    if (error) {
      console.log(error.message)
      res.status(400)
      res.send({error_msg : error.message})
    } else {
      res.status(200)
      res.send(decodedToken)
    }
  } )
})


//API 2 - send data to database from received file
app.post("/data/", checkToken, async (req, res) => {
  const gotData = req.body;
  gotData.forEach(async (each) => {
    const { userId, id, title, body } = each;
    const getDis = await db.run(`
          INSERT INTO uploaded (user_id, id, title, body)
          VALUES ('${userId}','${id}','${title}','${body}');
      `);
  });
  res.send("success");
});

//API 3 - Register new user 
app.post("/register/", async (req, res) => {
  const { username, fullname, password, } = req.body;
  const isExist = await db.get(`
    select * from user where username = '${username}'
  `);
  if (isExist === undefined) {
    if (password.length < 5) {
      res.status(400);
      res.send({ error_msg: "Password is too short" });
      console.log("Password is too short");
    } else {
      const encryptedPass = await bcrypt.hash(password, 10);
      const addUser = await db.run(`
            insert into user (username,full_name,password) values ('${username}','${fullname}','${encryptedPass}');
        `);
      res.status(200);
      res.send({ msg : "User created successfully"});
      console.log("User created successfully");
    }
  } else {
    res.status(400);
    res.send({ error_msg: "User already exists" });
    console.log("User already exists");
  }
});


//API 4 - send stored data from database to frontend
app.get("/return/", checkToken, async (req, res) => {
  const getFromDatabase = await db.all(`
    SELECT * FROM uploaded
    `);
  res.send({ getFromDatabase });
});


// test api
app.get('/test' , (req,res) => {
  console.log('test done')
  res.send('test text appering!!')
})


//ok nothing deleted


module.exports = app;
