const fs = require('fs');
const https = require('https');
const path = require("path");
const express = require('express');
const helmet = require("helmet");
const passport = require("passport");
const {Strategy} = require("passport-google-oauth20");
const cookieSession = require("cookie-session");

require('dotenv').config();

const PORT = 3000;

const config = {
    CLIENT_ID:process.env.CLIENT_ID,
    CLIENT_SECRET:process.env.CLIENT_SECRET,
    COOKIE_KEY_1:process.env.COOKIE_KEY_1,
    COOKIE_KEY_2:process.env.COOKIE_KEY_2,
}

const AUTH_OPTIONS = {
    callbackURL : '/auth/google/callback',
    clientID : config.CLIENT_ID,
    clientSecret : config.CLIENT_SECRET,
}

function verifyCallback(accessToken, refreshToken, profile, done){
    console.log('Google Profile',profile);
    done(null, profile);  //done(error,data)
}

passport.use(new Strategy(AUTH_OPTIONS,verifyCallback));

// Save the session to the cookie
passport.serializeUser((user,done)=>{
    done(null, user.id);
});

// Read the session from the cookie
passport.deserializeUser((id,done)=>{
    done(null,id);
});

const app = express();
app.use(helmet());

app.use(cookieSession({
    name:"session",
    maxAge:24 * 60 * 60 * 1000,
    keys: [config.COOKIE_KEY_1, config.COOKIE_KEY_2]
}));
app.use(passport.initialize());  //intialize passport session
app.use(passport.session());


function checkLoggedIn(req,res,next){
    console.log("Current User",req.user);
    const loggedIn = req.isAuthenticated() && req.user; //TODO
    if(!loggedIn){
        return res.status(401).json({
            error: "You must log in !!!"
        })
    }
    next();
}

app.get('/auth/google',
    passport.authenticate('google',{
        scope:['email'],
    })
);

app.get('/auth/google/callback',passport.authenticate('google',{
    failureRedirect:'/failure',
    successRedirect:'/',
    session:true,
}),(req,res)=>{
    console.log('Google called us back');
});

app.get('/auth/logout',(req,res)=>{
    req.logOut();  //remove req.user and clears any logged in session
    return res.redirect('/');
});

app.get('/secret',checkLoggedIn,(req,res)=>{
    return res.send("Your personal secret is 42!!!");
})

app.get('/',(req,res)=>{
    return res.sendFile(path.join(__dirname,'public','index.html'));
})


https.createServer({
    key:fs.readFileSync('key.pem'),
    cert:fs.readFileSync('cert.pem'),
},app).listen(PORT,()=>{
    console.log(`Server is Started on ${PORT}`);
})