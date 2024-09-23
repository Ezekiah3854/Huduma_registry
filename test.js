var express = require('express');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var path = require('path');
let state = ""
var port = 3099;
let yourDetails,yourOut,AllAttendance;

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "zack3854?",
    database: "huduma"
});

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'assets')));

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log("Connection to the database is successful...");
});

function timeNow() {
    

    // Get the current date and time
    let now = new Date();

    // Extract the hours, minutes, and seconds
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();

    // Add leading zeros to hours, minutes, and seconds if needed
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    // Create time string in 24-hour format
    let time24Hour = hours + ':' + minutes + ':' + seconds;

    return time24Hour;
}

function todaysDate() {
    // Get the current date and time
    let now = new Date();

    // Get the date components
    let year = now.getFullYear();
    let month = now.getMonth() + 1; // Months are zero-based
    let day = now.getDate();

    // Add leading zeros to day and month if needed
    month = month < 10 ? '0' + month : month;
    day = day < 10 ? '0' + day : day;

    // Create date string in YYYY-MM-DD format
    let dateString = day + '/' + month + '/' + year;
    return dateString;
}

app.get('/', (req, res) => {
    res.render('start', { details: null, found: false });
});

app.get('/signIn/give_personalNumber', (req,res) => {
    state = "signedIn";
    res.render('inputPersonalNum');
})

app.get('/signOut/give_personalNumber', (req,res) => {
    state = "signedOut";
    res.render('inputPersonalNum');
})

app.get('/search_details', (req,res) => {
    res.render('start');
})

app.post('/search_details', (req, res) => {
    var searchId = req.body.personalNumber;

    let sql = 'SELECT name, desk, phoneNo FROM hudumastaff WHERE secretNum = ?';
    db.query(sql, [searchId], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            yourDetails = result[0];
            res.render('confirmDetails', { details: result[0], found: true, state});
        } else {

            res.render('noDetails', {state});
        }
    });
});

app.get('/recheck_details', (req,res) => {
    if(state == "signedIn") {
        res.redirect('/signIn/give_personalNumber');
    }else if(state == "signedOut") {
        res.redirect('/signOut/give_personalNumber');
    }
})

app.get('/signAsAdmin', (req,res) => {
    res.render('adminSignIn');
})



app.get('/message_to_you', (req,res) => {
    
    let sql = 'SELECT * FROM dailystaffattendance WHERE staffName = ? AND dateToday = ?';
    let values = [yourDetails.name, todaysDate()]

    if(state === "signedIn") {

        db.query(sql, values, (err, results) => {
            if(err) throw err;

            else if(results.length > 0) {
                res.send(`<script>alert("You've already signed in for today...Thank you!"); window.location.href = document.referrer;</script>`);
            } 
            else {
                let insertSql = 'INSERT INTO dailystaffattendance(staffName,staffDesk,timeIn,timeOut,dateToday) VALUES (?,?,?,?,?)';
                let insertValue = [yourDetails.name,yourDetails.desk,timeNow(),'',todaysDate()];

                db.query(insertSql, insertValue, (error,data) => {
                    if(error) throw error;

                    res.render('thanksMessage', {welcome : yourDetails});
                })
            }
        })
        

    } 
    else if(state === "signedOut") {

        db.query(sql, values, (err, results) => {
            if(err) throw err;

            else if(results.length > 0 && results[0].timeOut == '') {
                let updateSql = 'UPDATE dailystaffattendance SET timeOut = ? WHERE staffName = ? AND dateToday = ?';
                let updateValues = [timeNow(), yourDetails.name, todaysDate()];

                db.query(updateSql, updateValues, (err, result) => {
                    if(err) throw err;
                    res.render('goodbye', {welcome : yourDetails});
                })
            } 
            else if(results.length > 0 && results[0].timeOut != '') {
                yourOut = true;
                res.send(`<script>alert("You've already signed out for today... Goodbye!!"); window.location.href = document.referrer;</script>`);
            }
            else {
                res.send(`<script>alert("You've not signed in for today..."); window.location.href = document.referrer;</script>`);
            }
        })

    }
})

app.post('/signAsAdmin', (req,res) => {
    var username = req.body.username;
    var password = req.body.password;
    var choice = req.body.choice;
    
    if(choice == 'super_admin') {
        if(username == "zack" && password == "123") {
            res.render('adminStaffAdd');
        }else {
            res.send('<script>alert("Invalid Super Admin credentials. Try again..."); window.location.href = document.referrer;</script>');
        }
    } else if(choice == 'center_manager') {
        if(username == "rachael" && password == "123") {
            let getSql = 'SELECT * FROM dailystaffattendance';
            
            db.query(getSql, (err, staffData) => {
                if(err) throw err;
                res.render('staffAttendance', {attendance : staffData});
            })

            
        }else {
            res.send(`<script>alert("Invalid CM's credentials. Try again..."); window.location.href = document.referrer;</script>`);
        }
    }

})



app.post('/add_staff_info', (req,res) => {
    var staffNo = req.body.staffNo;
    var staffName = req.body.staffName;
    var staffDesk = req.body.staffDesk;
    var staffPhoneNo = req.body.staffPhoneNo;

    var sql = "INSERT INTO hudumastaff(secretNum, name, desk, phoneNo) VALUES (?,?,?,?)";
    var values = [staffNo,staffName,staffDesk,staffPhoneNo];

    db.query(sql, values, (err, results) => {
        if(err) {
            res.send(`<script>alert("Error while adding the information. Try again!"); window.location.href = document.referrer;</script>`);
        }
        res.send(`<script>alert("Staff details added successfully."); window.location.href = document.referrer;</script>`);
        
    })
})

app.listen(port, () => {
    console.log(`The server is running on http://localhost:${port}`);
});


