const mongoose = require('mongoose'); 
const dotenv = require('dotenv');
const app = require('./app');
dotenv.config({ path: './config.env'});

// // -------------------- Connect to Remote Hosted DataBase ---------------------- // 
// const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

// mongoose.connect(DB, {
//     useNewUrlParser: true,
// }).then(() => console.log('Remote database connection successfull!')).catch(err => {
//     console.log("ERROR: " + err);
// });

// --------------------- Connect to Local DataBase --------------------------------- // 
mongoose.connect(process.env.DATABASE_LOCAL, {
}).then(() => console.log('Local database connection successfull!')).catch(err => {
    console.log("ERROR: " + err);
});

const port = process.env.PORT || "3000";
app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});