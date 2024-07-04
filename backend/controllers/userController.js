const asyncHandler = require('express-async-handler')
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const generateToken = (id) => {
  return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: "1d"})
};


const registerUser = asyncHandler( async(req, res) => {
    const{name, email, password} = req.body ;
    //validation 
    if(!name || !email || !password){
      res.status(400)
      throw new Error("Please fill in all required field")
    }
    if(password.length < 6){
      res.status(400)
      throw new Error("Password must contain more than 6 character")
    }
    //checking if user already exist in DB
    const user = await User.findOne({email})
    if(user){
      res.status(400)
      throw new Error("Email already registered")
    }
    //create new user
    const newUser = await User.create({name, email, password})
    //generate token
    const token = generateToken(newUser._id);
    //send HTTP-only cookie 
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 10000 * 86400), //one day
      sameSite: "none",
      secure: true
    })
    if(newUser){
      const {_id, name, email,bio, photo, phone} = newUser;
      res.status(201).json({
      _id,name, email, bio, photo, phone, token, 
      });
      
    }else {
      res.status(400)
      throw new Error("Invalid user data")
    }
  }
);

//User Login
const loginUser = asyncHandler(async(req, res) => {
  const {email, password} = req.body;
  //validation 
  if(!email || !password){
    res.status(400)
    throw new Error("Please add email and password")
  }
  
  const user = await User.findOne({email});
  if(!user){
    res.status(400)
    throw new Error("User not found, please sign up")
  }
  const correctPassword = await bcrypt.compare(password, user.password);

   //generate token
    const token = generateToken(user._id);
    //send HTTP-only cookie 
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 10000 * 86400), //one day
      sameSite: "none",
      secure: true
    })

  if(user && correctPassword){
    const {_id, name, email,bio, photo, phone} = user;
    res.status(200).json({
      _id,name, email, bio, photo, phone,token  
    })
  }else{
    res.status(400)
    throw new Error("Invalid credentials")
  }
})


//LOGOUT USER
const logoutUser = asyncHandler(async(req, res) => {
  res.cookie("token", "", {
      path: "/",
      httpOnly: true,
      expires: new Date(0), //one day
      sameSite: "none",
      secure: true
    })
    return res.status(200).json({
      message: "Logged out successfully!"
    })
})

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
}