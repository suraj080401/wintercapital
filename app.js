require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(express.static("public"));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-suraj:$income1B@cluster0.ohokt.mongodb.net/blogDB", {useNewUrlParser: true,useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

const postSchema = new mongoose.Schema({
  name: String,
  title: String,
  content: String
});
const Post = mongoose.model("Post", postSchema);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  userContent: [postSchema]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);


passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/", function(req, res){

  Post.find({}, function(err, posts){
    res.render("home", {
      posts: posts
      });
  });
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/compose");
});

app.get("/login", function(req,res){
  res.render("login",{});
});

app.get("/signup",function(req,res){
  res.render("signup",{});
});

app.get("/compose", function(req, res){
  if (req.isAuthenticated()){
    res.render("compose");
  } else {
    res.redirect("/login");
  }
});

app.post("/compose", function(req, res){
  const post = new Post({
    name:req.body.username,
    title: req.body.postTitle,
    content: req.body.postBody
  });
  post.save(function(err){
    if (!err){
        res.redirect("/");
    }
  });
  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.userContent.push(post);
        foundUser.save(function(err){
          if(err)
          {
            res.redirect("/");
          }
        });
      }
    }
  });
});

app.get("/posts/:postId", function(req, res){

const requestedPostId = req.params.postId;

  Post.findOne({_id: requestedPostId}, function(err, post){
    res.render("post", {
      name: post.name,
      title: post.title,
      content: post.content
    });
  });

});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.get("/about", function(req, res){
  res.render("about");
});

app.post("/signup", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/signup");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/compose");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(err){
        if(err)
        {
          console.log(err);
        }
        res.redirect("/compose");
      });
    }
  });
});


app.listen(process.env.PORT || 3000, function() {
  console.log("Server started on port 3000");
});
