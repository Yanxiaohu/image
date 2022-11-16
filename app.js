const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const app = express();
const bodyParser = require('body-parser');
const formidable = require('formidable');


// ------------------- 请求数据库操作 ----------------------------//
const {login, isLogin, getUsers, addUser, delUser} = require('./config');
//拦截所有请求
//extends:true 方法内部使用第三方模块请求的参数
app.use(bodyParser.urlencoded({extends: false}))

app.post('/login', function (req, res) {
    login(req.body, res);
})

app.get('/isLogin', function (req, res) {
    isLogin(req.query, res);
})
//写方法拉去数据
app.get('/getUsers', function (req, res) {
    getUsers(req.query, res);
})
app.post('/addUser', function (req, res) {
    addUser(req.body, res);
})
app.post('/delUser', function (req, res) {
    delUser(req.body, res);
})

app.post('/upload', (req, res) => {
    //创建formidable表单解析对象
    const form = new formidable.IncomingForm();
    //保留上传文件的后缀名字
    form.keepExtensions = true;
    //设置上传文件的保存路径
    form.uploadDir = path.join(__dirname, 'uploads');
    //解析客户端传递过来的formData对象
    form.parse(req, (err, fields, files) => {
        //req:请求对象，err错误对象，filelds：普通请求参数的内容
        //files：文件的内容的参数包括保存的地址信息
        //成功之后响应一个ok
        console.log(files);
        res.send(
            {
                "code": 0
                , "msg": ""
                , "data": {
                    "src": "http://cdn.layui.com/123.jpg"
                }
            }
        );
    })
});
// ------------------- 前端路由页面 ----------------------------//
const {index, users, images, imagesManager} = require('./routes/index');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(index, users, images, imagesManager);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});


// --------------------------------  程序启动 ----------------------------------- //
// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

// 显示ip地址和端口
const os = require('os');

function getIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
}

console.log('速美特提醒您：');
console.log('程序已正常启动......');
console.log('点击一下网址即可预览效果');
console.log('http://' + getIPAddress() + ':' + 8081)


module.exports = app;
