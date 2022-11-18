// 数据库链接
const mysql = require('mysql');
const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'my_db_02'
})
const jwt = require('jsonwebtoken');

const login = function (body, res) {
    const {username, password} = body;
    conn.query('select * from user_info_list where username =? AND password =?', [username, password], (err, results) => {
        if (err) return console.log(err.message)
        let result = {};
        if (results.length == 0) {
            result = {
                code: 0,
                message: '用户名密码错误',
            }
        } else {
            const cache = results[0];
            const rule = {
                username,
                id: cache.id,
                usertype: cache.usertype,
            };
            //生成token:privateKey:"abcdefg",私钥，可以自己定义，生成token；expiresIn:"7d"token过期时间7天
            jwt.sign(rule, "abcdefg", {expiresIn: "1d"}, function (err, token) {
                //"Bearer" token前缀
                token = "Bear" + token
                //返回token
                res.json({token, msg: '登录成功！', code: 1})
            })
        }
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
    conn.query('select managername,usertype from user_info_list where username =?', [username], (err, results) => {
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
                username: results[0].managername,
                usertype: results[0].usertype,
                message: '用户登录状态有效',
            }
        }
        res.send(result);
    })
}

const getUsers = function (body, res) {
    const {page, limit} = body;
    conn.query('select id,username,managername,usertype,workshop from user_info_list limit ?,?', [(page - 1) * 10, limit * 1], (err, results) => {
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
    const {username, password, managername, usertype, workshop} = body;
    conn.query('select * from user_info_list where username = ?', [username], (err, results) => {
        if (results.length == 0) {
            conn.query('INSERT INTO user_info_list (username, password, managername, usertype,workshop) VALUES (?, ?, ?, ?,?)', [username, password, managername, usertype, workshop], (err, results) => {
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

const delUser = function (body, res) {
    const {token, del_id} = body;
    const {id} = JSON.parse(token);
    console.log(id, del_id)
    if (id * 1 == del_id * 1) {
        res.send({
            code: 1,
            message: '用户不能删除自己，请增加超级管理员后删除自己。',
        });
    } else {
        conn.query('delete from user_info_list where id = ?', [del_id], (err, results) => {
            if (err) return console.log(err.message)
            res.send({
                code: 0,
                message: '用户已删除',
            });
        })
    }
}
const addImage = function (body, image_name, url, res) {
    const now = new Date().getTime();
    conn.query('select * from image_info_list where image_name = ?', [image_name], (err, results) => {
        if (results.length == 0) {
            conn.query('INSERT INTO image_info_list (image_name, managername, up_time,url) VALUES (?, ?, ?,?)', [image_name, '颜虎', now, url], (err, results) => {
                if (err) return console.log(err.message)
                res.send(
                    {
                        "code": 0
                        , "msg": "上传成功"
                    }
                );
            })
        } else {
            res.send({
                code: 1,
                message: '图片名重复，请确认后上传',
            });
        }
    });
}

const getImages = function (body, res) {
    const {page, limit, image_name} = body;
    if (image_name === undefined) {
        conn.query('select id,image_name,url,up_time,managername from image_info_list order by id desc limit ?,?', [(page - 1) * 10, limit * 1], (err, results) => {
            if (err) return console.log(err.message)
            conn.query('select count(*) count from image_info_list', (err, count) => {
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
    } else {
        conn.query('select id,image_name,url,up_time,managername from image_info_list where image_name like ? order by id desc limit ?,? ', ['%'+image_name+'%', (page - 1) * 10, limit * 1], (err, results) => {
            if (err) return console.log(err.message)
            conn.query('select count(*) count from image_info_list where image_name = ?', [image_name], (err, count) => {
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

}

const delImage = function (body, res) {
    const {del_id} = body;
    conn.query('delete from image_info_list where id = ?', [del_id], (err, results) => {
        if (err) return console.log(err.message)
        res.send({
            code: 0,
            message: '用户已删除',
        });
    })

}
module.exports = {login, isLogin, getUsers, addUser, delUser, addImage, getImages, delImage};