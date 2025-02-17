const mongoose = require('mongoose');
const bcrypt = require('bcryptjs')

const UserSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add a name"]
  },
  email: {
    type: String,
    required: [true, "Please add an email"],
    unique: true,
    trim: true,
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, 
      "Please enter a valid email"
    ]
  },
  password: {
    type: String,
    required: [true, "Please add a password"],
    minLength: [6, 'Password must be up to 6 character']
  },
  photo: {
    type: String,
    required: false,
    default: "https://asset.cloudinary.com/dlpz9g0qh/ab3f82652d86c6f7a6ef30b537e1fd7a"
  },
  phone: {
    type: String,
    default: "+61"
  },
  bio: {
    type: String,
    maxLength: [230, "Password must not be more than 23 characters"],
    default: "bio"
  }
}, {
  timestamps: true
})


//encrypt password befor saveing into DB
UserSchema.pre("save", async function(next){
  if(!this.isModified("password")){
    return next();
  }
  //hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(this.password, salt);
  this.password = hashedPassword;
  next();
})

const User = mongoose.model("User", UserSchema)
module.exports = User
