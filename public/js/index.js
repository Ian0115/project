require('dotenv').config();
const express = require('express');
const app = express();
const session = require('express-session');
const db = require(__dirname + '/db_connect'); // 引用 db_connect.js 的資料庫連線
const bcrypt = require('bcryptjs');
const multer = require('multer');
// const upload = multer({dest:'tm'});
const fs = require('fs');
app.set('view engine', 'ejs'); // 設定樣版引擎
app.use(express.urlencoded({ extended: false })); // 使用 urlencoded
app.use(express.json()); // 使用 json
app.use(express.static('public')); // 使用public資料夾下的靜態資源

app.use(session({
    saveUninitialized: false,
    resave: false,
    secret: 'secretary string',
    cookie: {
        maxAge: 1200000
    }
}));

app.get('/', (req, res) => {
    // res.locals.title = 'Home -' + res.locals.title;
    res.render('index');
});

app.get('/camera', (req, res) => {
    res.render('camera');
});

app.get('/photo', (req, res) => {
    res.render('photo');
});



const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'tm')
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

var upload = multer({ storage: storage })

app.get('/upload', (req, res) => {
    res.render('upload');
});

app.post('/upload', upload.single('file'), async(req, res, next) => {
    // const output = {
    //     success: false,
    //     error: '',
    //     postData: req.file,
    // };
    // console.log(req.file)
    // if(!req.body){
    //     output.error = '欄位資料不足';
    //     return res.json(output);
    // }

    // res.json(output)

    let newPath = `upload/${req.file.originalname}`
    fs.rename(req.file.path, newPath, () => {
        res.json({ result: 'image uploaded successful' })
    })

    let imgPath = { image: `upload/${req.file.fieldname}` }
        // try {
        //     await db.query(`UPDATE user SET img = ? WHERE userId = "${req.session.user.userId}"`, req.file.buffer);
        //     res.send({
        //       success: true,
        //       message: '上傳圖片成功'
        //     });
        //   } catch (err) {
        //     next(err.sqlMessage);
        //   }
});

// login start //
app.get('/login', (req, res) => {
    res.render('login');
});
app.post('/login', async(req, res) => {
    const output = {
        success: false,
        error: '',
        postData: req.body,
    };
    if (!req.body.email || !req.body.password) {
        output.error = '欄位資料不足';
        return res.json(output);
    }

    const sql = "SELECT * FROM users WHERE account=? ";
    const [rs] = await db.query(sql, [req.body.email]);
    if (!rs.length) {
        output.error = '帳號錯誤';
        return res.json(output);
    }

    const sql1 = "SELECT * FROM users WHERE user_password=? ";
    const [rs1] = await db.query(sql1, [req.body.password]);
    if (!rs1.length) {
        output.error = '密碼錯誤';
        return res.json(output);
    } else {
        req.session.users = {
            user_id: rs[0].user_id,
            user_email: rs[0].user_email,
            user_name: rs[0].user_name,
        };
        output.success = true;
    }
    res.json(output)

    // const result = await bcrypt.compare(req.body.password, rs[0].password_hash);
    // if (result) {
    //     req.session.admin = {
    //         account: rs[0].account,
    //         // nickname: rs[0].nickname,
    //     };
    //     output.success = true;
    // } else {
    //     output.error = '密碼錯誤';
    // }

    // res.json(output);
});
// login end //

//logout start //
app.get('/logout', (req, res) => {
    delete req.session.users;
    res.redirect('/');
});
// logout end //

// signup start //
app.get('/signup', (req, res) => {
    res.render('signup');
});
app.post('/signup', async(req, res) => {
    const output = {
        success: false,
        postData: req.body, // 丟回 client 以方便除錯
        error: '',
        code: 0,
    };

    // 接收 req 裡面的資料
    let { name, email, password, password2, tel } = req.body;

    // 檢查姓名
    if (name.length < 2) {
        output.error = '姓名字串長度要超過兩個字';
        return res.json(output);
    }

    if (password.length < 4) {
        output.error = '密碼至少超過四個字';
        return res.json(output);
    }

    // 檢查密碼和確認密碼是否一致
    if (password != password2) {
        output.error = '密碼和確認密碼欄位輸入不同!';
        return res.json(output);
    }

    // SQL 指令
    const sql = `INSERT INTO users
                 (account,
                 password_hash,
                 Tel,)
                 VALUES (?,?,?);`;
    // 執行 SQL
    const [result] = await db.query(sql, [email, password, tel]);

    output.result = result;
    if (result.affectedRows) {
        output.success = true;
    }
    res.json(output); // 回傳output結果
});
// signup end //

// 放在所有路由的後面
app.use((req, res) => {
    res.type('text/html');
    res.status = 404;
    res.send(`
    path: ${req.url} <br>
    <h2>404 - page not found</h2>
    `);
});
// 設定 port
app.listen(3002, () => {
    console.log('process.argv:', process.argv);
    console.log('server started!');
});