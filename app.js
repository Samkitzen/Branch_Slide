const express = require('express')
const fs = require('fs')
const bodyParser = require('body-parser')
const path = require('path')
const multer = require('multer')
const decompress = require('decompress');
const CSVToJSON = require('csvtojson');
const csvwriter = require('csv-writer')

require('dotenv').config()

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


//Configuration for Multer
const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/files");
    },
    filename: (req, file, cb) => {
        const ext = file.mimetype.split("/")[1];
        if (ext === 'x-zip-compressed') {
            cb(null, `${file.fieldname}.zip`);
        } else {
            cb(null, `${file.fieldname}.${ext}`);
        }
    },
});

//Calling the "multer" Function
const upload = multer({
    storage: multerStorage,
});


var createCsvWriter = csvwriter.createObjectCsvWriter
// Passing the column names intp the module
const csvWriter = createCsvWriter({
    // Output csv file name is geek_data
    path: __dirname + '/public/final.csv',
    header: [

        // Title of the columns (column_names)
        { id: 'enroll_no', title: 'enroll_no' },
        { id: 'name', title: 'Name' },
        { id: 'gender', title: 'Gender' },
        { id: 'total', title: 'Total' },
        { id: 'category', title: 'category' },
    ]
});


const generateJSONFiles = async (applied) => {

    var files, dirs, cnt = 0;
    const dict = {}
    dirs = await fs.readdirSync('public/dist');
    for (const folder of dirs) {
        var folderPath = `public/dist/${folder}`
        var files = await fs.readdirSync(folderPath)
        for (const file of files) {
            var fileLocation = path.join(folderPath, file)
            const objArray = await CSVToJSON().fromFile(fileLocation)

            for (const obj of objArray) {
                if (applied[obj.enroll_no]) {
                    if (!obj['total']) {
                        obj['total'] = obj['Total(MM-100)']
                        delete obj['Total(MM-100)']
                    }

                    if (dict[obj.enroll_no]) {
                        var t = dict[obj.enroll_no];
                        t.total += parseInt(obj.total);
                        t.subject += 1;
                        dict[obj.enroll_no] = t;
                    } else {
                        console.log(applied[obj.enroll_no]);
                        dict[obj.enroll_no] = { "enroll_no": obj.enroll_no, "rollno": obj.roll_number, "name": obj.NAME, "total": parseInt(obj.total), "subject": 1, "category": applied[obj.enroll_no].category, "gender": applied[obj.enroll_no].gender };
                    }
                }
            }

        }
    }
    return dict;
}



//Routes

app.get("/", (req, res) => {
    res.render("index")
})


app.post("/api/uploadFile", upload.fields([{ name: 'sem1ZipFile' }, { name: 'sem2ZipFile' }, { name: 'branchChange' }]), async (req, res) => {
    //extracting uploaded zip files
    decompress(__dirname + '/public/files/sem1ZipFile.zip', 'public/dist').then(() => {
        console.log("first decompressed");
        decompress(__dirname + '/public/files/sem2ZipFile.zip', 'public/dist').then(() => {
            console.log("second decompressed");

            CSVToJSON().fromFile('public/files/branchChange.csv')
                .then(objArray => {
                    var applied = {}
                    for (const obj of objArray) {
                        applied[obj.enroll_no] = obj;
                    }
                    return generateJSONFiles(applied);
                }).then((dict) => {
                    const branchC = []

                    for (const [key, value] of Object.entries(dict)) {
                        branchC.push(value);
                    }

                    branchC.sort((a, b) => (b.total - a.total || a.gender === 'F' || a.gender === 'M' || a.category === 'ST' || a.category === 'SC' || a.category === 'OBC' || a.category === 'GEN'));
                    console.log(branchC);
                    const json = JSON.parse(JSON.stringify(branchC))
                    csvWriter.writeRecords(json).then(() => {
                        var dirs = fs.readdirSync('public/dist');
                        for (const folder of dirs) {
                            var folderPath = `public/dist/${folder}`
                            fs.rmdirSync(folderPath,{recursive:true})
                        }
                        fs.rmSync('public/files/branchChange.csv')
                        fs.rmSync('public/files/sem1ZipFile.zip')
                        fs.rmSync('public/files/sem2ZipFile.zip')
                            console.log("CSV Made success");
                        })
                })
        })
    })
    setTimeout(() => {
        res.render('success')
    }, 5000);
})


//Filing structure 

//User upload three files for sem1,sem2 and applied students file
//saving these files in files folder in public dir

//Two files are in zip 
//decompress and storing in dist folder

//Combining all files from sem1 and sem2 into jsonfiles folder

//then combining students based on unique enroll_no into finalfile.json 
//here total is taken from all files and subject count is taken 


app.get("/h", (req, res) => {
    res.render("success")
})










app.listen(3000, () => {
    console.log("Server Starts Successfully.....");
})