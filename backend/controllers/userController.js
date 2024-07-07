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

//get user data from db
const getUser = asyncHandler(async(req, res) =>{
  const user = await User.findById(req.user._id);
  if(user){
    const {_id, name, email,bio, photo, phone} = user;
    res.status(200).json({
      _id,name, email, bio, photo, phone,  
    })
  }else{
    res.status(400)
    throw new Error("User not found")
  }
});


//Get login status
const loginStatus = asyncHandler(async(req, res) =>{
  const token = req.cookies.token;
  if(!token){
    return res.json(false);
  }
  //verify token
  const verified = jwt.verify(token, process.env.JWT_SECRET)
  if(verified){
    return res.json(true);
  }
  return res.json(false);
})

//Update user 
const updateUser = asyncHandler(async(req, res) => {
  const user = await User.findById(req.user._id);
  if(user){
    const { name, email,bio, photo, phone} = user;
    user.email = email;
    user.name = req.body.name || name;
    user.bio = req.body.bio || bio;
    user.phone = req.body.phone || phone;
    user.photo = req.body.photo || photo;

    const updatedUser = await user.save()
    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      bio: updatedUser.bio,
      photo: updatedUser.photo,
      phone: updatedUser.phone,
    })
  }else{
    res.status(404)
    throw new Error("User not found")
  }
})

const changePassword = asyncHandler(async(req, res) => {
  const user = await User.findById(req.user._id);
  if(!user){
    res.status(400)
    throw new Error("User not found, Please sign up");
  }
  const {oldPassword, password} = req.body;
  //validation 
  if(!oldPassword || !password){
    res.status(400)
    throw new Error("Please add old and new password")
  }
  
  const validPassword = await bcrypt.compare(oldPassword, user.password)

  if(user && validPassword){
    user.password = password
    await user.save();
    res.status(200).send("password changed sucessfully")
  }else{
    res.status(400)
    throw new Error("Old password is incorrect")
  }
})

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  loginStatus,
  updateUser,
  changePassword,
}