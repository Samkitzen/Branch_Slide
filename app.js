const express = require('express')
const fs = require('fs')
const bodyParser = require('body-parser')
const path = require('path')
const multer = require('multer')
const decompress = require('decompress');
const CSVToJSON = require('csvtojson');
const { DiscFullTwoTone } = require('@material-ui/icons')

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


// //extracting files function
// const extractFiles = async () => {
//     try {
//         const filesSem1 = await decompress(__dirname + '/public/files/sem1ZipFile.zip', 'public/dist');
//         const filesSem2 = await decompress(__dirname + '/public/files/sem2ZipFile.zip', 'public/dist');
//     } catch (err) {
//         console.log(err);
//     }
// }

//function to convert csv files to json
const convertToJson = (fileLocation, file) => {
    CSVToJSON().fromFile(fileLocation)
        .then(objArray => {
            objArray.forEach(obj => {
                delete obj['Test-1(MM-20)']
                delete obj['Test-2(MM-20)']
                delete obj['Test3(MM-20)']
                delete obj['Best2(MM-40)']
                delete obj['Endsem(MM-60)']
                delete obj['SR.NO.']
                delete obj['theory_grade']
                delete obj['practical_grade']
                if (!obj['total']) {
                    obj['total'] = obj['Total(MM-100)']
                    delete obj['Total(MM-100)']
                }
            })
            fs.writeFileSync(`public/jsonfiles/${file}.json`, JSON.stringify(objArray, null, 4));
        }).catch(err => {
            console.log(err);
        });
}



//Routes

app.get("/", (req, res) => {
    res.render("index")
})

app.post("/api/uploadFile", upload.fields([{ name: 'sem1ZipFile' }, { name: 'sem2ZipFile' }, { name: 'branchChange' }]), async (req, res) => {
    const filesSem1 = await decompress(__dirname + '/public/files/sem1ZipFile.zip', 'public/dist');
    const filesSem2 = await decompress(__dirname + '/public/files/sem2ZipFile.zip', 'public/dist');

    res.json("Uploaded Successfully!!")
})

app.get('/generate', (req, res) => {
    try {
        fs.readdir('public/dist', (err, dirs) => {
            dirs.forEach((folder) => {
                var folderPath = `public/dist/${folder}`
                fs.readdir(folderPath, (err, files) => {
                    files.forEach((file, index) => {
                        var fileLocation = path.join(folderPath, file)
                        convertToJson(fileLocation, file)
                    })
                })
            })
        })
        res.send("complete")
    } catch (err) {
        res.send(err)
    }
})


app.get("/onefile", (req, res) => {
    var dict = {};
    fs.readdir('public/jsonfiles', (err, files) => {
        if (err) {
            console.log(err);
        } else {
            files.forEach((file, intdex) => {
                const data = require(`./public/jsonfiles/${file}`)
                data.forEach((record) => {
                    if (dict[record.enroll_no]) {
                        var t = dict[record.enroll_no];
                        t.total += parseInt(record.total);
                        t.subject += 1;
                        dict[record.enroll_no] = t;
                    } else {
                        dict[record.enroll_no] = { "enroll_no": record.enroll_no, "rollno": record.roll_number, "name": record.NAME, "total": parseInt(record.total), "subject": 1 };
                    }
                })
            })
        }
        // const finalArray = []
        // for (const [key, value] of Object.entries(dict)) {
        //     finalArray.push(value)
        // }
        // fs.writeFile('public/finalfile.json', JSON.stringify(finalArray), (err) => {
        //     console.log(err);
        // });


        CSVToJSON().fromFile('public/files/branchChange.csv')
            .then(objArray => {
                fs.writeFileSync(`public/branchchange.json`, JSON.stringify(objArray, null, 4));
            }).catch(err => {
                console.log(err);
            });
        const branchC = require('./public/branchchange.json');
        branchC.forEach((obj) => {
            if (dict[obj.enroll_no]) {
                obj['total'] = dict[obj.enroll_no].total;
            }
        })

        res.send(branchC)
    })
})




//Filing structure 

//User upload three files for sem1,sem2 and applied students file
//saving these files in files folder in public dir

//Two files are in zip 
//decompress and storing in dist folder

//Combining all files from sem1 and sem2 into jsonfiles folder

//then combining students based on unique enroll_no into finalfile.json 
//here total is taken from all files and subject count is taken 













app.listen(3000, () => {
    console.log("Server Starts Successfully.....");
})