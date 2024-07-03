const dotenv = require("dotenv").config()
const express = require('express')
const mongoose = require('mongoose');
const bodyParser = require('body-parser')
const cors = require("cors")
const userRoute = require('./routes/userRoute')
const errorHandler = require('./middleWare/errorMiddleware')

const app = express();


//middlewares
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(bodyParser.json());

//route middleware
app.use('/api/users',userRoute);
//routes
app.get('/', (req, res) =>{
  res.send("Homepage")
})

//error middleware
app.use(errorHandler);


const PORT = process.env.PORT || 5000

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('connected to db')
    app.listen(PORT, () => {
      console.log(`server running on port ${PORT}`)
    })
  }).catch((err) => console.log(err))