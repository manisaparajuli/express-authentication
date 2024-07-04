const asyncHandler = require('express-async-handler')
const User = require("../models/userModel")
const bcrypt = require('bcryptjs')

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

    //encrypt password befor saveing into DB
    const salt = await bcrypt.genSalt(10);
    const hasedPassword = await bcrypt.hash(password, salt);

    //create new user
    const newUser = await User.create({name, email, password: hasedPassword})
    if(newUser){
      const {_id, name, email,bio, photo, phone} = newUser
      res.status(201).json({
      _id,name, email, bio, photo, phone 
      });
    }else {
      res.status(400)
      throw new Error("Invalid user data")
    }
  }
);


module.exports = {
  registerUser,
}