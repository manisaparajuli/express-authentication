const asyncHandler = require('express-async-handler')
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Token = require("../models/tokenModel")
const crypto = require("crypto")
const sendEmail = require("../utils/sendEmail")
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

const forgotPassword = asyncHandler(async(req, res) => {
  const {email} = req.body;
  const user = await User.findOne({email})
  if(!user){
    res.status(404)
    throw new Error("User does not exist")
  }
  //delete existing token 
  let token = await Token.findOne({userId: user._id})
  if(token){
    await token.deleteOne()
  }

  let resetToken = crypto.randomBytes(32).toString("hex") + user._id
  console.log(resetToken)
  //hash token before saving to db
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")
  
  //saving token to db
  await new Token({
    userId: user._id,
    token : hashedToken,
    createdAt:  Date.now(),
    expireAt:  Date.now() + 30 * 60000, 
  }).save()

  //construct reset URL 
  const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`
  console.log(resetToken)
  //reset email
  const message = `
    <h2>Hello ${user.name}</h2>
    <p>Please use the following url to reset your password</p>
    <p>This url is valid for only 30 minutes</p>
    <a href=${resetUrl} clicktracking=off>${resetUrl}</a>
    <p>Regards</p>
    <p> Manisha ptv. ltd.</p>
  `
  const subject = "Password reset request"
  const send_to = user.email
  const send_from = process.env.EMAIL_USER
  try{
    await sendEmail(subject, message,send_to, send_from)
    res.status(200).json({success: true, message: "reset email sent"})
  }catch(err){
    res.status(500)
    throw new Error("Email not sent please try again ")
  }
  res.send("Forgot password email")
})

//Reset Password
const resetPassword = asyncHandler(async(req, res) => {
  const {password} = req.body
  const {resetToken } = req.params

  
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")

  const userToken = await Token.findOne({
    token: hashedToken,
    expireAt: {$gt: Date.now()}
  })
  
  if(!userToken ){
    res.status(404)
    throw new Error("Invalid or expired token")
  }
  const user = await User.findOne({_id: userToken.userId})

  user.password = password
  await user.save()
  res.status(200).json({message: "password reset successfully, Please login"})
})

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  loginStatus,
  updateUser,
  changePassword,
  forgotPassword,
  resetPassword,
}