const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

var Schema = mongoose.Schema;
var ETrackerSchema = new Schema({
    username:  {type: String, required: true},
    userId: String,
    description: {type: String},
    duration: {type: Number},
    date: {type: Date}
  });

var ETracker = mongoose.model("ETracker", ETrackerSchema);

var ETUserSchema = new Schema({
    username:  {type: String, required: true},
  });

var ETUser = mongoose.model("ETUser", ETUserSchema);


// Not found middleware
app.use((req, res, next) => {
  //console.log(req.body);
  if (!req.body) {
    return next({status: 404, message: 'not found'})  // was: return next({status: 404, message: 'not found'})
  }
  next();
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  //res.status(errCode).type('txt')
  //  .send(errMessage)
  console.log(errMessage);
  res.send(errMessage);
})

// 1. I can create a user by posting form data username to /api/exercise/new-user and returned will be an object with username and _id.
app.post("/api/exercise/new-user", function(req, res) {
  const username = req.body.username;
  var eUser = new ETUser({username: username});
  eUser.save(function(err, data) {
    if (err) {
      console.log(err);
      res.send("Error saving");
    } else {
      console.log("new user set up"); 
      res.json({username: username, id: eUser._id});
    }
  });
});


// 3. I can add an exercise to any user by posting form data userId(_id), description, duration, and optionally date to /api/exercise/add.
// If no date supplied it will use current date. Returned will the the user object with also with the exercise fields added.
app.post("/api/exercise/add", function(req, res) {
  // add a date picker to date?
  const username = req.body;
  // check to ensure userId is in database. If not return error.
  ETUser.findById({_id: username.userId}, function(err, user) {
    console.log(user);
    if (err) {
      console.log(err);
      res.send("no such user id");
    } else {
    // add exercise to user's document
    var newUser = new ETracker({username: user.username, userId: user._id, description: username.description, duration: username.duration});
    username.date ? newUser.date = username.date : newUser.date = new Date(); 
    newUser.save(function(err, data) {
      if (err) {
        console.log("Error: ", err);
        res.send("Error saving exercise");
      } else {
        console.log("new user set up", data); 
        res.json({"username": user.username, "userId": user._id, "description": newUser.description, "duration": newUser.duration, "date": newUser.date});
      }
    });
  }
  });
});

// 2. I can get an array of all users by getting api/exercise/users with the same info as when creating a user. (username and _id)
app.get("/api/exercise/users", function(req, res) {
  ETUser.find({}, function(err, data) {
    console.log(data);
    res.json(data);
  });
});


// 4.I can retrieve a full exercise log of any user by getting /api/exercise/log with a parameter of userId(_id). Return will be the user
// object with added array log and count (total exercise count).
// 5. I can retrieve part of the log of any user by also passing along optional parameters of from & to or limit. (Date format yyyy-mm-dd, limit = int)
// GET /api/exercise/log?{userId}[&from][&to][&limit] ***  eg  /api/exercise/log?userId=5bdb6ad79bcadb4161154946&from=2018-04-09&to=2018-11-01&limit=3
app.get("/api/exercise/log?", function(req, res) { 
  if(req.query.userId !== undefined) { 
    let fromD = new Date(req.query.from);
    let toD = new Date(req.query.to);
    let limitE = +req.query.limit;
    if (limitE === undefined) { limitE = 0;}

    let query = {userId: req.query.userId};
    if (fromD == "Invalid Date" || toD == "Invalid Date") {
      console.log("Invalid date"); 
    } else {
      query = {userId: req.query.userId, date: { $gte: fromD, $lte: toD }};
    }
    
    ETracker.find(query).limit(limitE).exec(function(err, data) {
      if (err) {
        res.send("Error finding documents");
      }
      else {
        if (data.length !== 0) {
          res.json(data);
        } else {
          res.send("No data from the query");
        }
      }
    });
  } else {
    res.send("No user requested");
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

