const express = require('express')
const mongoose = require('mongoose')
const fs = require('fs')
const bodyParser = require('body-parser')
const path = require('path')
require('dotenv').config()
const multer = require('multer')
const csv = require('csv-parser')

const File = require("./model/fileSchema");
const app = express()


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(`${__dirname}/public`));
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);
process.on("uncaughtException", (err) => {
    console.log("UNCAUGHT EXCEPTION, APP SHUTTING NOW!!");
    console.log(err.message, err.name);
    process.exit(1);
});



const calculate = () => {
    let results = [];

    const folderPath = path.join(__dirname, "/public/files");
    fs.readdirSync(folderPath);
    fs.readdirSync(folderPath).map(fileName => {
        let result = []
        const fileLocation = path.join(folderPath, fileName);
        fs.createReadStream(fileLocation)
        .pipe(csv())
        .on('data', (data) => result.push(data))
        .on('end', () => {
            results = [...results,result];
        });
    });
    console.log(results);
}


//Routes

app.get("/", (req, res) => {
    res.render("index")
    calculate()
})

//Configuration for Multer
const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public");
    },
    filename: (req, file, cb) => {
        const ext = file.mimetype.split("/")[1];
        cb(null, `files/${file.fieldname}-${Date.now()}.${ext}`);
    },
});

// Multer Filter
const multerFilter = (req, file, cb) => {
    if (file.mimetype.split("/")[1] === "csv") {
        cb(null, true);
    } else {
        cb(new Error("Not a CSV File!!"), false);
    }
};
//Calling the "multer" Function
const upload = multer({
    storage: multerStorage,
    // fileFilter: multerFilter,
});


app.post("/api/uploadFile", upload.array("myFiles"), async (req, res) => {
    res.json("Success")
})



























app.listen(3000, () => {
    console.log("Server Starts Successfully.....");
})