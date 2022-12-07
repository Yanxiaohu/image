const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const app = express();
const bodyParser = require('body-parser');

// ------------------- 请求数据库操作 ----------------------------//
const {
    login, isLogin,
    getUsers, addUser, editUser, delUser,
    getImages, uploads, delImage,
    getLogs,
    getFactories, addFactory, editFactory, delFactory,
    addWorkshop, getWorkshops, editWorkshop, delWorkshop,
    fileRead,
    imageRead,
    apply, getApply, editApply
} = require('./config');
//拦截所有请求
//extends:true 方法内部使用第三方模块请求的参数
app.use(bodyParser.urlencoded({extends: false}))

app.post('/login', function (req, res) {
    login(req.body, req.ip, res);
})

app.get('/isLogin', function (req, res) {
    isLogin(req.query, req.ip, res);
})
//写方法拉去数据
app.get('/getUsers', function (req, res) {
    getUsers(req, res);
})
app.post('/addUser', function (req, res) {
    addUser(req, res);
})
app.post('/editUser', function (req, res) {
    editUser(req, res);
})
app.post('/delUser', function (req, res) {
    delUser(req, res);
})

app.get('/getImages', function (req, res) {
    getImages(req, res);
})
app.post('/delImage', function (req, res) {
    delImage(req, res);
})
app.post('/upload', function (req, res) {
    uploads(req, res);
});
app.get('/getLogs', function (req, res) {
    getLogs(req, res);
})
app.get('/getFactories', function (req, res) {
    getFactories(req, res);
})
app.post('/addFactory', function (req, res) {
    addFactory(req, res);
})
app.post('/editFactory', function (req, res) {
    editFactory(req, res);
})
app.post('/delFactory', function (req, res) {
    delFactory(req, res);
})
app.post('/addWorkshop', function (req, res) {
    addWorkshop(req, res);
})
app.get('/getWorkshops', function (req, res) {
    getWorkshops(req, res);
})
app.post('/editWorkshop', function (req, res) {
    editWorkshop(req, res);
})
app.post('/delWorkshop', function (req, res) {
    delWorkshop(req, res);
})
// 图片浏览
app.use(express.static('uploads'));
app.get('/uploads/*', function (req, res) {
    fileRead(req, res, __dirname);
})
app.get('/imageRead', function (req, res) {
    imageRead(req, res);
})
app.post('/apply', function (req, res) {
    apply(req, res);
})
app.get('/getApply', function (req, res) {
    getApply(req, res);
})
app.post('/editApply', function (req, res) {
    editApply(req, res);
})
// ------------------- 前端路由页面 ----------------------------//
const {
    index,
    users,
    images,
    imagesManager,
    actionsLogs,
    imagesUpload,
    factories,
    workshop,
    pageApply
} = require('./routes/index');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(index, users, images, imagesManager, actionsLogs, imagesUpload, factories, workshop, pageApply);
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


