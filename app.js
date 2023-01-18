const express = require('express');
const session = require('express-session');
const app = express();
const port = 3000;
const sql = require('mysql');
const body = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const { send, umask } = require('process');
const { resolve } = require('path');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./images");
    },
    filename: (req, file, cb) => {

        cb(null, `${Date.now()}_${file.originalname}`);
    }
});


const upload = multer({ storage: storage }).single('image');

app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));

app.set('views', __dirname + '/views');

app.use(body.json());

app.use(session({
    secret: 'werwbatvsrfbgxzdftgv',
    resave: false,
    saveUninitialized: false
}));

app.use(express.urlencoded({ extended: true }));




const conn = sql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234567',
    database: 'surgery'
});

app.get('/all-doctors',
    async function (req, response) {
        if(req.session.userType == 2){
        let x = await searchUser({ type: 1, code: -1 });
        response.send({
            reply: x
        });
        }else{
            res.send();
        }
        

    });

app.get('/pat-id/:id',
    async function (req, res) {
        if(req.session.userType){
        let x = await getPatientById(req.params.id);
        res.send(JSON.stringify(x));
        }else{
            res.redirect(null);
        }
    });

async function getPatientById(id) {
    return new Promise((resolve, reject) => {
        conn.query(`SELECT * FROM patient where code =${id} ;`,
            (err, res) => {
                return resolve(res);
            }
        );
    });
}


async function searchUser(mm) {
    return new Promise((resolve, reject) => {
        let query = mm.code != -1 ? `where d.username = '${mm.type}';` : '';
        if (mm.code == -2) {
            conn.query(`
                SELECT d.code as 'doc_code', un.id as 'usernameID', d.username as 'code', CONCAT(FName," ",LName) as 
                'Name',speciality,phone_1,imageLoc 
                FROM doctor d join usernames un on d.username = un.username;
                `,
                (err, res) => {
                    return resolve(res);
                }
            );
        } else {
            conn.query(
                `
                  SELECT * FROM doctor d join usernames un on d.username = un.username ${query}
                `,
                (err, res) => {
                    return resolve(res);
                }
            );
        }
    });
}


async function login(username, password) {
    return new Promise((resolve, reject) => {
        conn.query(
            `SELECT ID,type FROM surgery.usernames 
             where username = '${username}' and password = '${password}';`,
            function (err, res) {

                return resolve(res);
            }
        );
    }
    );
}

async function docs() {
    return new Promise(
        (resolve, reject) => {
            conn.query(`SELECT * FROM surgery.doctor;`,
                (err, res) => {
                    if (res.length != 0)
                        return resolve(res);
                });
        }
    );
}


app.get('/contact', function (req, res, next) {
    res.render('contact');

});

app.get('/about', function (req, res, next) {
    res.render('about');
});

app.get('/', function (req, res, next) {
    res.render('index');
});

app.post('/Equipments/update/:id', async function (req, res) {
    if(req.session.userType == 2){
        let id = req.params.id.split('-')[0];
        let qu = req.params.id.split('-')[1];
        await deleteEquipment(id,qu);
        res.redirect('/Equipments');
    }else{
        res.redirect('/login');
    }
});






async function deleteEquipment(id, quantity){
    return new Promise(
        async (resolve, reject) => {
           await  conn.query(
            `
                UPDATE tools SET no_Tools = '${quantity}' WHERE (Code = '${id}');
             `, (err, res) => {
                 if (res != null)
                     return resolve(res);
             });
 
         }
     );
}

app.post('/contact', async function (req, res) {

    await contactUS(req.body);
    res.redirect('/contact');
});

async function contactUS(e){
    conn.query(`
    INSERT INTO surgery.contactus 
    (message, name, email, subject) VALUES ('${e.message}', '${e.name}', '${e.email}', '${e.subject}');    
    `);
}
app.get('/Equipments', async function (req, res) {
    if(req.session.userType == 2){

        let eq = await getAllEquipments();

        res.render('EquipmentDashboard',{userModel:req.session.user,active:9,equip:eq});
    }else{
        res.redirect('/login');
    }
});



async function getAllEquipments(){
    return new Promise(
       async (resolve, reject) => {
          await  conn.query(`
            SELECT * FROM surgery.tools;  
            `, (err, res) => {
                if (res != null)
                    return resolve(res);
            });

        }
    );
}




app.get('/new-nurse', function (req, res, next) {
    
    if(req.session.userType == 2){
        res.render('AddNurseDashboard',{active:3, userModel: req.session.user});
    }else{
        res.redirect('/login');
    }
});

app.get('/operations',async function (req, res, next) {
    if(req.session.userType){
        let operations = await getDocOperations(null);
        res.render('OperationDashboard',{active:7
            , userModel: req.session.user
            , operations:operations
            });
    }else{
        res.redirect('/login');
    }
    
});




app.post('/action_page_2', async (req, res) => {
    if(req.session.userType == 2){
        let period = req.body.period;
        let choose = req.session.choice;
        let date = choose.op_date.split('-');

        console.log(choose.main_doc);

        eventregistration({
            operation_name:choose.op_name,
            duration:2,
            room:choose.room_ID,
            patientname:choose.patient_name,
            month:+date[1],
            day:+date[2],
            period:period,
            hour:4,
            doc_id:choose.main_doc
        });


        res.redirect('/new-operations-2');
    }else{
        res.send(null);
    }
});






app.post('/action_page_1', async (req, res) => {
    if(req.session.userType == 2){

       let date = req.body.op_date.split('-');

        console.log(req.body);

       let y = await usedrooms({
            day:date[2],
            month:date[1],
            year:date[0],
            room:req.body.room_ID
        });
        let x = [];
        for(let i=0;i<y.length;i++){
            x.push(y[i].period);
        }
        req.session.rooms = x;
        req.session.choice = req.body;

        res.redirect('/new-operations-2');
    }else{
        res.send(null);
    }
});

app.get('/new-operations-2', async function (req, res, next) {
    if(req.session.userType && req.session.rooms) {
      
       let patients = await getAllPatients();
      
       let docs = await searchUser({ type: 1, code: -2 });
       let nurse = await getAllNurses();

       res.render('AddOperationDashboard2',{active:6,
           docs:docs,
           patients:patients,
           nurses:nurse, userModel: req.session.user,
           rooms:req.session.rooms
       });

   }else{
       res.redirect('/login');
   }
   
});


app.get('/new-operations-1', async function (req, res, next) {
     if(req.session.userType) {
        
        let patients = await getAllPatients();
       
        let docs = await searchUser({ type: 1, code: -2 });
        console.log(docs);
        let nurse = await getAllNurses();

        res.render('AddOperationDashboard',{active:6,
            docs:docs,
            patients:patients,
            nurses:nurse, userModel: req.session.user
        });

    }else{
        res.redirect('/login');
    }
    
});

app.get('/patient-left',(req,res)=>{
    if(req.session.userType){
        res.render('PatientLeftDashboard',{active:8, userModel: req.session.user});
    }else{
        res.redirect('/login');
    }
});

app.post('/new-nurse', async function (req, res, next) {
    
    if(req.session.userType == 2){
        let m = req.body;
        let ans = await addNurse(m);
        res.send(ans);
    }else{
        res.redirect('/login');
    }
});
app.get('/volundon',(req,res)=>{
    res.render('volundon');
});
async function addNurse(m) {
    return new Promise(
      async  (resolve, reject) => {
            await conn.query(
                `select username from usernames where username = '${m.username}';`
                , async (err, res) => {
                    if (res != null && res.length != 0) return resolve(false);
                    else {
                        await conn.query(
                            `INSERT INTO nurse (username, FName, MName, LName, SSN, B_D, City, Street, Building, Email, Phone_1, Phone_2, Salary,sex) VALUES ('${m.username}','${m.fname}', '${m.mname}', '${m.lname}','${m.ssn}','${m.b_d}','${m.city}','${m.street}', '${m.building}', '${m.email}', '${m.phone_1}', '${m.phone_2}', ${m.salary},${m.gender});`
                            ,(err,res)=>{
                                if(!err){
                                    conn.query(
                                        `INSERT INTO usernames (UserName, Password, type) VALUES ('${m.username}', '${m.password}', 3);`
                                        , (err) => {
                                            return resolve(!err);
                                        }
                                    );
                                }else return resolve(false);
                            }
                        );
                    }
                }
            );
        }
    );
}




app.get('/patientmain',(req,res)=>{
    if(req.session.userType == 4){
        res.render("patientmain");
    }
});


app.get('/login',
    function (req, response) {
        if(!req.session.userType){
            response.render('login');
        }else{
            
            if(req.session.userType == 2){
                response.redirect('/dashboard');
            }else if(req.session.userType == 1){
                response.redirect('/doctormainpage');
            }else if(req.session.userType == 4){
                console.log("aaa");
                response.redirect('/patientmain');
            }
        }
    },
);


app.get('/donate',(req,res)=>{
    res.render('volundon');
});


app.post('/donate',async (req,res)=>{
    await donate(req.body);
    res.redirect('/donate');
});


async function donate(donation){
    return new Promise(
        (resolve,reect)=>{
            conn.query(
                `
                INSERT INTO surgery.transactions (Name, Email, Phone, cost) 
                VALUES ('${donation.Name}', '${donation.email}', '${donation.phone}', ${donation.cost});
                `
                ,(err,res)=>{
                    return resolve(!err);
                }
            );
        }
    );
}





app.post('/logout',(req,res)=>{
    req.session.destroy();
    res.send(200);
});

app.post('/login',
    async (req, res) => {
        let n = req.body;
        if (n.email != "" && n.password != "") {
            let result = await login(n.email, n.password);
            console.log(result);
            if (result.length == 0) {
                result = [{ type: -1, ID: -1 }];
            }

            if(result[0].type > 0){
                req.session.userType = result[0].type;
                req.session.username = n.email;
            }
            
            res.json({
                result: result[0].type,
                ID: result[0].ID
            });
            
            res.end();
        }
    }
)

app.get("/doctormainpage",
    async (req, res) => {
        if(req.session.userType == 1){
            if(!req.session.user){
                let x = await profile(1,req.session.username);
                req.session.user = x[0];
            }
            let op = await getDocOperations(req.session.user.Code);
            res.render('mainPageDoctor',{operations:op,docModel:req.session.user});
        }else{
            res.redirect('/login');
        }
    }
);
app.get("/doctor-profile",
    async (req, res) => {
        if(req.session.userType == 1){
            res.render('users-profile',{docModel:req.session.user});
        }else{
            res.redirect('/login');
        }
    }
);

app.post("/doctor-profile/edit",
    async (req, res) => {
        if(req.session.userType == 1){
            
        }else{
            res.redirect('/login');
        }
    }
);

app.get("/new-doctor",
    async (req, res) => {
        if(req.session.userType == 2){
            res.render('AddDoctorDashboard',{active:2, userModel: req.session.user});
        }else{
            res.redirect('/login');
        }
    });

app.get('/images/:path', (req, res) => {
    if(req.session.userType){
        if(req.params.path != "null"){
            res.download(`./images/${req.params.path}`);
        }else{
            res.end();
        }
        
    }else{
        res.redirect('/login');
    }
});


app.post("/edit-doc",
    async (req, res) => {
        if(req.session.userType == 2 || req.session.userType == 1){
            await edit_doctor(req.body,req.session.user.code,req.session.user.username);
            let x = await profile(1, req.session.user.username);
            req.session.user = x[0];
        
            res.redirect('/doctor-profile');
        }else{
            res.send(null);
        }
    });

async function edit_doctor(docProfile,code,oldusername){
    
    return new Promise(
        (resolve, reject) => {
           conn.query(
            `
            UPDATE usernames SET UserName = '${docProfile.Username}' 
            where (UserName = '${oldusername}');
            `,(err,res)=>{
                if(!err){
                    conn.query(
                        `
                        UPDATE doctor SET username = '${docProfile.Username}', Fname = '${docProfile.Fname}', Mname = '${docProfile.Mname}', Lname = '${docProfile.Lname}', Email = '${docProfile.Email}', city = '${docProfile.City}', street = '${docProfile.Street}', building = '${docProfile.Building}', phone_1 = '${docProfile.phone_1}', phone_2 = '${docProfile.phone_1}', speciality = '${docProfile.Speciality}' ,SSN = '${docProfile.SSN}' WHERE (code = '${code}');
                        
                        `, (err, res) => {
                        if (!err)
                            return resolve(true);
                    }
                    );
                }
            }
           );
           
           
           
            
        }
    );
}

app.get('/notification/:id', async (req, res) => {
    if(req.session.userType == 1){
        let id = req.params.id;
        let reply = await getNotification(id);
        res.send(reply);
    }else{
        res.send(null);
    }
});









app.put('/notification',
    async (req, res) => {
        let reply = await sendNotification(req.body.msgfrom, req.body.msgto, req.body.content);
        res.send({ reply: reply });
    });

async function sendNotification(msgfrom, msgto, content) {
    return new Promise(
        (resolve, reject) => {
            conn.query(
                `
                INSERT INTO notifications (msgfrom, msgto, content) 
                VALUES (${msgfrom}, ${msgto}, '${content}');
                `, (err, res) => {
                if (!err)
                    return resolve(true);
            }
            );
        }
    );

}
app.delete('/delete-notification',
    async (req, res) => {
        let id = req.body.id;

        let x = await deleteNotification(id);
        res.json({
            res: x
        });
    });



async function getNotification(id) {
    return new Promise(
        (resolve, reject) => {
            conn.query(`
            select n.ID, CONCAT(e.Fname," ", e.Lname) AS fromName ,n.content
            from notifications n join employee e 
            on n.msgfrom = e.ID and msgto = ${id};  
            `, (err, res) => {
                if (res != null)
                    return resolve(res);
            });

        }
    );
}

async function deleteNotification(id) {
    return new Promise((resove, reject) => {
        conn.query(
            `
            DELETE FROM notifications where ID = ${id};
            `, (err, res) => {
            if (err) {
                return resove(false);
            } else {
                return resove(true);
            }
        }
        );
    });
}

app.post("/new-doctor", upload, async (req, res) => {
    
    if(req.session.userType == 2){
        let n = req.body;
        let f = null;
        if(req.file != null){
            f = req.file.filename;
        }

        let x = await insertDoc(n, f);

        res.json({
            reply: x,
            link: "/login"
        });
    }else{
        res.send(null);
    }
    
    
});


app.get("/new-employee", async (req, res) => {
    
    if(req.session.userType == 2){
        res.render('AddEmployeeDashboard',{active:5, userModel: req.session.user});
    }else{
        res.redirect('/login');
    }
});
app.post("/new-employee", async (req, res) => {
    if(req.session.userType == 2){
        let n = req.body;
        let x = await insertEmployee(n);
        res.json({
            reply: x,
            link: "/login"
        });
    }else{
        res.send(null);
    }
    
    
    
});



app.get("/doc-uname/:id", async (req, res) => {
    
    if(req.session.userType){
        let t = req.params.id;
        let x = await searchUser({ type: t, code: 1 });
        res.send(x);
    }else{
        res.send(null);
    }
});


app.get("/room/:id", async (req, res) => {
   
    if(req.session.userType){
         let n = req.params.id;
         let x = await getRoomByID(n);
         res.send(x);
    }else{
        res.send(null);
    }
});

app.get('/all-patients', async (req, res) => {
    
    if(req.session.userType == 2){
        let p = await getAllPatients();
        res.send(p);
    }else{
        res.send(null);
    }
});


app.post("/doc-patients", async (req, res) => {
    if(req.session.userType == 2 || req.session.userType == 1){
        let n = req.body.code;
        let x;
        if (req.body.Needed == "operation") {
            x = await getDocOperations(n);
        }
        res.json({
            reply: x,
        });
    }else{
        res.send(null);
    }
    
   
});


app.get('/m-dashboard',
    async function (req, res, next) {
        // let rep = await getAllPatients();
        // let docs = await searchUser({ type: 1, code: -2 });
        if(req.session.userType == 2){
            let overView = await getOverView();
            res.json({
                overView: overView
            });
        }else{
            res.send(null);
        }
    });


app.get('/dashboard',
    async function (req, res, next) {
        if(req.session.userType == 2){
            if(!req.session.user){
                let x = await profile(2,req.session.username);
                req.session.user = x[0];
            }

            let rep = await getAllPatients();
            let docs = await searchUser({ type: 1, code: -2 });
            let overView = await getOverView();
            res.render('dashboard', 
            { patients: rep, docs: docs, overView: overView[0],active:1, userModel: req.session.user  });    
        }else{
            res.redirect('/login');
        }
    });

app.get('/patient-:id', async function (req, res, next) {
    
    if(req.session.userType){
        let x = await profile(4, req.params.id);
        res.render('patientTemplate', { model: x[0] });
    }else{
        res.redirect('/login');
    }

});

app.get('/doctor-:id', async function (req, res, next) {
    

    if(req.session.userType){
        let model = await profile(1, req.params.id);
        res.render('doctemplate', { model: model[0] });
    }else{
        res.redirect('/login');
    }
});








app.get('/all-nurses', async function (req, res, next) {
    if(req.session.userType == 2){
        let model = await getAllNurses();
        res.send(model);
    }else{
        res.send(null);
    }
});


async function getAllNurses() {
    return new Promise(
        (resolve, reject) => {
            conn.query(
                `
                    SELECT * FROM surgery.nurse;
                `,
                (err, res) => {
                    return resolve(res);
                }
            );
        }
    );
}





app.delete('/delete-doc', async function (req, res) {

    let rep = await deleteDoctor(req.body.code, req.body.usernameID);
    res.json({ res: rep });
});


async function deleteDoctor(id, usernameID) {
    return new Promise(
        (resolve, reject) => {
            conn.query(
                `
                SET SQL_SAFE_UPDATES = 0;
                Delete from notifications where msgto = ${id};
                Delete from operation_doctors where Doctor_Code = ${id};
                Delete from usernames where ID = ${usernameID};
                Delete from doctor where code = ${id};
                `,
                (err, res) => {
                    return resolve(!err);
                }
            );
        }
    );
}




async function profile(LoggedAccType, LoggedAcc) {
    return new Promise(
        async (res, rej) => {
            if (LoggedAccType == 1) { // doctor
                await conn.query(`select * from surgery.doctor where username = '${LoggedAcc}';`,
                    (err, result) => {
                        return res(result);
                    });
            }
            else if (LoggedAccType == 3) {
                await conn.query(`select * from surgery.nurse where username = '${LoggedAcc}'`, (err, result) => {
                    return res(result);
                });
            }
            else if (LoggedAccType == 2) {
                await conn.query(`select * from surgery.employee 
    where username = '${LoggedAcc}';`, (err, result) => {
                    return res(result);
                });
            } else if (LoggedAccType == 4) {
                await conn.query(`select * from surgery.patient 
    where username = '${LoggedAcc}';`, (err, result) => {
                    return res(result);
                });
            }
        }


    )
}



async function getOverView() {
    return new Promise(
        async (resolve, reject) => {
            await conn.query(
                `
                Select (select count(*) from doctor) as doctor, 
	            (select count(*) from patient) as patient,
	            (select count(*) from nurse) as nurse,
	            (select count(*) from employee) as employee
                `
                , (err, res) => {
                    return resolve(res);
                });
        }
    );
}

async function getAllPatients() {
    return new Promise(async (resolve, reject) => {
        await conn.query(
            `SELECT * FROM surgery.patient;`
            , (err, res) => {
                return resolve(res);
            });
    });

}



async function getDocOperations(n) {
    let query = "";
    if(n != null){
        query = `select code,Name,Patient_Code,Room_Number,Time,Duration,Cost from 
        operation_doctors od join operations o on od.Operations_Code = o.code
        and Doctor_Code = ${n};`;
    }else{
        query =  `select o.code,o.Name  ,CONCAT(p.FName ," ", p.LName) as 'Patient_Name'  ,Time,Duration,Cost 
        from operations o join patient p on o.Patient_Code = p.code;`
    }
    return new Promise(async (resolve, reject) => {
        await conn.query(query, (err, res) => {
            if (res != null) {
                return resolve(res)
            }
        });
    });
}
async function getRoomByID(id) {
    return new Promise(async (resolve, reject) => {
        await conn.query(`select * from rooms where ID = ${id};`, (err, res) => {
            if (res != null) {
                return resolve(res)
            }
        });
    });
}
app.get("/new-patient", async (req, res) => {
    
    if(req.session.userType == 2){
        res.render('AddPatientDashboard',{active:4, userModel: req.session.user});
    }else{
        res.redirect('/login');
    }
});


app.post("/new-patient", async (req, res) => {
    
    if(req.session.userType == 2){
        let n = req.body;
        let x = await insertPatient(n);
        res.json({
             reply: x,
             link: "/login"
        });
    }else{
        res.send(null);
    }


    
});


app.get("/admin-balance", async (req, res) => {
    
    if(req.session.userType == 2){
        let ans = await getHospitalBalance();
        res.json({
            balance: ans[0].balance,
        });
    }else{
        res.send(null);
    }
});


app.get("/admin-:id", async (req, res) => {
    if(req.session.userType == 2){
        let uname = req.params.id;
    let model = await profile(2, uname);
    res.json({
        model: model[0],
    });
    }else{
        res.send(null);
    }
});


async function getHospitalBalance(n) {
    return new Promise(async (resolve, reject) => {
        await conn.query(
            `select sum(cost) as 'balance' from Transactions;`
            , async (err, res) => {
                return resolve(res);
            }
        );
    });
}






async function insertPatient(n) {
    return new Promise(async (resolve, reject) => {
        await conn.query(
            `select username from usernames where username = '${n.username}';`
            , async (err, res) => {
                if (res != null && res.length != 0)
                    return resolve(false);
                else {
                    await conn.query(
                        `
                        INSERT INTO patient (username,FName,MName,LName,Address,Phone_Personal,Phone_Family_1,Phone_Family_2,gender,Email,SSN,diabetes,High_cholesterol,smoking,drink_alcohol,exercise,have_children,other_health_conditions) VALUES ('${n.username}','${n.firstname}','${n.middlename}','${n.lastname}','${n.address}','${n.phonepersonal}','${n.phonefamily_1}','${n.phonefamily_2}',${n.gender},'${n.email}','${n.ssn}',${n.diabetes},${n.highcholesterol},${n.smoking},${n.drinkalcohol},${n.exercise},${n.havechildren},'${n.conditions}');
                        `
                    );
                    await conn.query(
                        `INSERT INTO usernames (UserName, Password, type) VALUES ('${n.username}', '${n.password}', 4);`
                        , (err) => {
                            if (!err) return resolve(true);
                            else console.log(err);
                        }
                    );
                }
            }
        );
    });
}

async function insertEmployee(n) {

    return new Promise(async (resolve, reject) => {
        await conn.query(
            `select username from usernames where username = '${n.username}';`
            , async (err, res) => {
                if (res != null && res.length != 0) return resolve(false);
                else {
                    await conn.query(
                        `INSERT INTO employee (username,SSN,FName,MName,LName,B_D,Salary,Address,Job_Describtion,Phone_1,Phone_2,gender) 
                         VALUES ('${n.username}','${n.ssn}','${n.firstname}' ,'${n.middlename}' ,'${n.lastname}' ,'${n.birthdate}',${n.salary} ,'${n.address}' ,'${n.jobdescribtion}' ,'${n.phone1}' ,'${n.phone2}' ,${n.gender});`);
                    await conn.query(
                        `INSERT INTO usernames (UserName, Password, type) VALUES ('${n.username}', '${n.password}', 2);`
                        , (err) => {
                            if (!err) return resolve(true);
                            else console.log(err);
                        }
                    );
                }
            }
        );
    });
}


async function insertDoc(n, path) {
    return new Promise(async (resolve, reject) => {
        await conn.query(
            `select username from usernames where username = '${n.username}';`
            , async (err, res) => {
                if (res != null && res.length != 0) return resolve(false);
                else {
                    await conn.query(
                        `INSERT INTO doctor (username,Fname, Mname, Lname,Email, Salary, BirthDate, city, street, building, phone_1, phone_2,gender ,speciality, SSN,imageLoc,Calender_ID) VALUES ('${n.username}','${n.firstname}', '${n.middlename}', '${n.lastname}','${n.email}', ${n.salary}, '${n.birthdate}', '${n.city}', '${n.street}', '${n.building}', '${n.phone1}', '${n.phone2}', ${n.gender},'${n.speciality}', '${n.ssn}','${path}','${n.calenderid}');`
                    );
                    await conn.query(
                        `INSERT INTO usernames (UserName, Password, type) VALUES ('${n.username}', '${n.password}', 1);`
                        , (err) => {
                            if (!err) return resolve(true);
                            else console.log(err);
                        }
                    );
                }
            }
        );


    });

}


//else
app.use((req, res) => {
    res.status(404).send("Sorry");
});

app.listen(port, () => {
    console.log('lestening to http://localhost:3000/');
});

////////////////////////////////////////////////////////
const { google } = require('googleapis');
require('dotenv').config();
// Provide the required configuration
let CREDENTIALS = { type: "service_accouunt", project_id: "serene-vim-373517", private_key_id: "18247804fcc056d7e5628b69b91d47766ecacbef", private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDJ4AM7ZI2rgLHr\nLQeNEaV+eSPugeii2Bu/p56bvq0CMIXmQjjFddzFYiiOTJWWptLLJOf/avmx5tT1\nuxR7mqL7ywjYmqLFK2b1B16Hl65T1ygbONKpKyOtZK0w3mKS8qMkJr1cgakqyf5z\nWqB8uB4QVSyTACD3w2+bwkXCcSUpfLWSD99lmLROI2EJtVzZK2BtJ8EGticG3J2T\ngNPGOtD7D64LwXAJror6v5Xu9FUbt0juZsTNepMOwn5zX9ebALE2Cg6haJoQr0Sz\n4DfiCWdSl39BDNUTr17X1c3QuMSgFGcM23qP3SXgtoHPfYx4aa8f+9YtkAzHDgI9\njMnUm+BjAgMBAAECggEAD0wUYp4Qs12NEQ/4W2lQm/m5AWjcEU7rJCw8jOFRG3JE\ncaABMxezZkxoXCDghJBynUy+ib1ejp6gjFhXSbOvkWeF7ZS8kp1JCXZvMTrxgLS0\nLml+L3rirFANmAwZ9lGnKOU7zyebtok+gn/SqApZn0CdBpMDBiAYmnoJSDeQd2+A\nC4IyV1OnO7ARAxilfCl4hOZ+eWoKfEEGM2mO3/nEvWXuKYvzMKxzmQTEzMsEjlKN\nEvGn6wTzMWGC3SiDKa4J1fcD3CTzeoIdTUa0bicGIFKpti3aCzkS3Dvpdw5mMNIu\nObmq4fCL6/KQqcRfhWxUch5fzaB64B/ybi0wcNSnNQKBgQD7yhf9ADYmuONg85Ca\nNDFAZ0V1sWzJAJtkEgMwqQzaV2dAbM8fLXOdItutiHMWh267njWn7w0ZehNXEReH\nX+5B9H8+Z3nsFS/lAtxok3asY4/LtahWF2vXJMCGzH7O9JEQ7OvtFSFY7LsqmGz6\nNF+PGbtcJuSyydF1K72fNY2TTQKBgQDNQDx+gzOVTZIH9HKkbPnXsLFMOsy3J16k\nH7AhbIr9JtZlnc6B9xHjB58mbpD4POQjj0ggXX0OxhbKtGL3898sRw+BdKGWDiNi\nGBpt6/tgdkAJu6z72EK+Av8gavoKfrPY5n/pVxyDviTo3ykf/wW+t5IhRJ9V0D4y\nopMgOlgKbwKBgCztfKZKWV9Dcl8kVtMNKRSi2MQNaqnbD98lT6hpIb/8BJJ8V+Dq\nTUzmoWgvhsmoVNvpeQ2EHERFghnxFM+1EGB4bhQGhrzXcvpcLlQCrBRKl6fzvBvQ\nhg+XoTrsVlw7S39HpzlgodiqNSN+m0NyAPMZ1lK1Je25EUTlDyrPdXmpAoGAfLWn\nDAeT9AepzwOMFLPSKmfFkle3wyE8s+Q9FFHrMV3DrwJvUzBXweYDoUpU8z+sLp8E\naAXl0nAxsQBhkd6vnyueFD5VX+M/RH74sAlON5Ih3sgVlwATrXgMpBnbyzyo8gU7\nev/e531E1+mgBzzgtLy9IVGcrntVD1cQpehNTikCgYEArXvPjOgoLvlmfLt7a2j7\nc/oxXb1l/ASBpdC7rF9fyaZhX71WyM5Cmi5BL7gTGoGvmZ6a0Pn/dvysAkYqfA2W\nXDyNfKd7ME2md286emqc54FkiC/2mXMHh8Cr6k0aU097UC68Cr963nckXJ3nhHOE\nWEGvB0DZtMVtiqhobexERc8=\n-----END PRIVATE KEY-----\n", client_email: "servacc@serene-vim-373517.iam.gserviceaccount.com", client_id: "111978187190650709735", auth_uri: "https://accounts.google.com/o/oauth2/auth", token_uri: "https://oauth2.googleapis.com/token", auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs", client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/servacc%40serene-vim-373517.iam.gserviceaccount.com" };
// const calendarId = process.env.CALENDAR_ID;

// Google calendar API settings
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const calendar = google.calendar({ version: "v3" });


const auth = new google.auth.JWT(
    CREDENTIALS.client_email,
    null,
    CREDENTIALS.private_key,
    SCOPES
);

// Your TIMEOFFSET Offset
const TIMEOFFSET = '00:00';


// Get current date-time in string form for calender
//////////////////////////////////////////////////////

//take event in jason and return start,end time of event
const dateTimeForCalander = (event) => {
    //start

    let month = event.month
    console.log(month)


    let day = `${event.day}`
    console.log(day)
    period = `${event.period}`
    let hour = 0
    if (period == 1)//12
    { hour = 12 }
    if (period == 2)//14
    { hour = 14 }
    if (period == 3)//16
    { hour = 16 }
    if (period == 4)//18
    { hour = 18 }
    if (period == 5)//20
    { hour = 20 }
    if (period == 6)//22
    { hour = 22 }
    if (period == 7)//24//00
    { hour = 0 }
    if (period == 8)//2
    { hour = 2 }
    if (period == 9)//4
    { hour = 4 }
    if (period == 10)//4
    { hour = 6 }
    if (period == 11)//4
    { hour = 8 }
    if (period == 12)//4
    { hour = 10 }

    console.log(hour)
    // for (i = 0; i < 12; i++) {
    //     while (i != period) {
    //         if (H = 22)
    //             H = H - 12
    //         else
    //             H = H + 2
    //     }
    // }
    // var H = H - 2

    let starttime = new Date(2023, month - 1, day);
    starttime.setHours(hour)
    console.log(starttime)
    // event_start.setUTCMinutes(min)
    //end
    let endtime = new Date(2023, month - 1, day);
    endtime.setHours(hour + 2)
    console.log(endtime)
    console.log(endtime)
    // // event_end.setUTCMinutes(min + 22)



    // console.log(`1${date}`)
    function to_calendar_format(date) {

        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        if (month < 10) {
            month = `0${month}`;
        }
        let day = date.getDate();
        if (day < 10) {
            day = `0${day}`;
        }
        let hour = date.getHours();
        if (hour < 10) {
            hour = `0${hour}`;
        }
        let minute = date.getMinutes();
        if (minute < 10) {
            minute = `0${minute}`;
        }

        let newDateTime = `${year}-${month}-${day}T${hour}:${minute}:00.000${TIMEOFFSET}`;
        // console.log(`2${newDateTime}`)
        console.log('2')
        console.log(newDateTime)
        let event = new Date(Date.parse(newDateTime));

        return event;
    }

    let event_start = starttime

    let event_end = endtime

    //  Delay in end time is 1
    return eventtime = {
        'start': event_start,
        'end': event_end
    }

};




// Get all the events between two dates
const getEvents = async (event) => {

    try {
        let response = await calendar.events.list({
            auth: auth,
            calendarId: eventdata.calendarid,
            timeMin: eventdata.dateTimeStart,
            timeMax: eventdata.dateTimeEnd,
            timeZone: 'Asia/Kolkata'
        });

        let items = response['data']['items'];
        return items;
    } catch (error) {
        console.log(`Error at getEvents --> ${error}`);
        return 0;
    }
};

let start = '2023-1-03T00:00:00.000Z';
let end = '2023-1-05T00:00:00.000Z';


////////////////////
////////////////////////deleting
//////////////////

//////will take json        event_delete->(room,start,end)
function getCalenderID(event_delete) {
    ///
}

// Delete an event from eventID

const deleteEvent = async (eventId) => {

    try {
        let response = await calendar.events.delete({
            auth: auth,
            calendarId: calendarid,
            eventId: eventId
        });

        if (response.data === '') {
            return 1;
        } else {
            return 0;
        }
    } catch (error) {
        console.log(`Error at deleteEvent --> ${error}`);
        return 0;
    }
};



//////get events by patient id

async function get_patient_events(patient) {

    return new Promise(async (resolve, reject) => {

        await conn.query(`SELECT * FROM event where patient_code = '${patient.code}';`,
            (err, res) => {
                if (res.length != 0)
                    return resolve(res);
                else
                    return null;
            }
        );
    });
}
//////get events by patient id

async function usedrooms(event) {

    return new Promise(async (resolve, reject) => {
        console.log(`SELECT period FROM event where day = '${event.day}'and month = '${event.month}'and year = '${event.year}'and room_id = '${event.room}';`);
        conn.query(`SELECT period FROM event where day = '${event.day}'and month = '${event.month}'and year = '${event.year}'and room_id = '${event.room}';`,
            (err, res) => {
                if (res.length != 0)
                    return resolve(res);
                else
                    return null;
            }
        );
    });
}


const insertEvent = async (eventinsertformat, event) => {
 let calendarid=0
    await conn.query(
        `select Calendar_Id from doctor where code = '${event.doc_id}';`
        , async (err, res) => {
            calendarid = res;
            console.log(`select Calendar_Id from doctor where code = '${event.doc_id}';`);

            console.log(calendarid);
        })  

        
    // try {
    //     let response = await calendar.events.insert({
    //         auth: auth,
    //         calendarId:calendarid,
    //         resource: eventinsertformat
    //     });

    //     if (response['status'] == 200 && response['statusText'] === 'OK') {
    //         return 1;
    //     } else {
    //         return 0;
    //     }
    // } catch (error) {
    //     console.log(`Error at insertEvent --> ${error}`);
    //     return 0;
    // }
    // let calendarid2=0
    // await conn.query(
    
    // `select Calendar_Id from room where ID = '${event.room_id}';`
    //     , async (err, res) => {
    //         if (res != null && res.length != 0) calendarid=res;
    //     })  
    

    // try {
    //     let response = await calendar.events.insert({
    //         auth: auth,
    //         calendarId:calendarid2,
    //         resource: eventinsertformat
    //     });

    //     if (response['status'] == 200 && response['statusText'] === 'OK') {
    //         return 1;
    //     } else {
    //         return 0;
    //     }
    // } catch (error) {
    //     console.log(`Error at insertEvent --> ${error}`);
    //     return 0;
    // }


};


// Event for Google Calendar
//////////////////////////////////////
////////////////////////////////
/////////////////
function eventregistration(event) {
    timeinsertformat = dateTimeForCalander(event)

    let eventinsertformat = {
        //eventsummary
        'summary': `${event.operation_name}`,
        'description': `${event.duration} hours ${event.operation_name} in Room ${event.room}for patient : ${event.patientname}`,
        'start': {
            'dateTime': timeinsertformat['start'],
            'timeZone': 'Asia/Kolkata'
        },
        'end': {
            'dateTime': timeinsertformat['end'],
            'timeZone': 'Asia/Kolkata'
        },



    }
    //console.log(eventinsertformat);

    insertEvent(eventinsertformat, event)
        .then((res) => {
            console.log(res);
        })
        .catch((err) => {
            console.log(err);
        });

    async function insertime(event) {
        return new Promise(async (resolve, reject) => {
            await conn.query(
                `select username from usernames where username = '${n.username}';`
                , async (err, res) => {
                    if (res != null && res.length != 0) return resolve(false);
                    else {
                        await conn.query(

                            `INSERT INTO event (year  ,month ,day ,period,doc_id,room_id) VALUES ('${event.year}','${event.month}', '${event.day}', '${event.period}', ${event.doc_id}, '${event.room_id}' );`,
                            await conn.query(
                                `INSERT INTO room (UserName, Password, type) VALUES ('${n.username}', '${n.password}', 1);`
                                , (err) => {
                                    if (!err) return resolve(true);
                                    else console.log(err);
                                }
                            ));
                    }
                }
            );


        });

    }
}

///////////////////////////////////
//////////////////////////////////
/////////////////////////////////

//delete event by patient id in main
function delete_calender_event(patient) {
    let event = get_patient_events(patient)
    calendartid = event.calendarid
    let eventgoogleformat = getEvents(event)
    ///will be edited
    ///// eventid= eventgoogleformat.eventid
    //
    deleteEvent(eventId)
        .then((res) => {
            console.log(res);
        })
        .catch((err) => {
            console.log(err);
        }
    );
}





