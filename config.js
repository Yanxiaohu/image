// 数据库链接
const mysql = require('mysql');
const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'my_db_02'
})

const login = function (body, res) {
    const {username, password} = body;
    conn.query('select * from user_info_list where username =? AND password =?', [username, password], (err, results) => {
        if (err) return console.log(err.message)
        const cache = results[0];
        let result = {};
        const token = JSON.stringify({
            username,
            type: cache.type,
            time: new Date().getTime()
        });
        if (results.length == 0) {
            result = {
                code: 0,
                message: '用户名密码错误',
            }
        } else {
            result = {
                code: 1,
                message: '用户名密码正确',
                token: token
            }
        }
        res.send(result);
    })
}

const isLogin = function (body, res) {
    const {token} = body;
    if (token.length == 0) {
        res.send({
            code: 0,
            message: '用户登录已过期，请重新登录',
        });
    }
    const {username, time} = JSON.parse(token);
    const now = new Date().getTime();
    conn.query('select * from user_info_list where username =?', [username], (err, results) => {
        if (err) return console.log(err.message)
        let result = {};
        if (results.length == 0 || now - time > 3000000) {
            result = {
                code: 0,
                message: '用户登录已过期，请重新登录',
            }
        } else {
            result = {
                code: 1,
                username,
                message: '用户登录状态有效',
            }
        }
        res.send(result);
    })
}

const getUsers = function (body, res) {
    const {page, limit} = body;
    conn.query('select id,username,typename,workshop from user_info_list', (err, results) => {
        if (err) return console.log(err.message)
        conn.query('select count(*) count from user_info_list', (err, count) => {
            if (err) return console.log(err.message)
            let result = {};
            result = {
                code: 0,
                count: count[0].count,
                data: results,
                message: '数据获取成功',
            }
            res.send(result);
        })
    })
}

const addUser = function (body, res) {
    const {username, password, typename, usertype, workshop} = body;
    conn.query('select * from user_info_list where username = ?', [username], (err, results) => {
        if (results.length == 0) {
            conn.query('INSERT INTO user_info_list (username, password, typename, usertype,workshop) VALUES (?, ?, ?, ?,?)', [username, password, typename, usertype, workshop], (err, results) => {
                if (err) return console.log(err.message)
                res.send({
                    code: 0,
                    message: '用户新增成功',
                });
            })
        } else {
            res.send({
                code: 1,
                message: '用户已存在',
            });
        }
    });
}

module.exports = {login, isLogin, getUsers,addUser};