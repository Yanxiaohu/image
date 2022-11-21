// 数据库链接
const mysql = require('mysql');
const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'my_db_02'
})
const jwt = require('jsonwebtoken');
const fs = require('fs');
const secret = 'YanchenImageManager';
const login = function (body, ip, res) {
    const {username, password} = body;
    conn.query('select manager_name,id,user_type,username,times from user_info_list where username =? AND password =?', [username, password], (err, results) => {
        if (err) return console.log(err.message)
        let result = {};
        if (results.length == 0) {
            result = {
                code: 5,
                message: '用户名密码错误',
            }
            res.json(result);
        } else {
            const cache = results[0];
            const rule = {...cache};
            rule.ip_info = ip;
            const times = rule.times ? rule.times + 1 : 1;
            conn.query('update user_info_list set ip_info=?,last_login_time = ?,times = ? where id=?', [ip, new Date().getTime(), times, cache.id]);
            jwt.sign(rule, secret, {expiresIn: "10h"}, function (err, token) {
                //"Bearer" token前缀
                token = token
                //返回token
                res.json({token, message: '登录成功！', code: 0})
            })
        }
    })
}
const isLogin = function (body, ip, res) {
    const {token} = body;
    jwt.verify(token, secret, function (err, decoded) {
        if (err) {
            res.send({
                code: 5,
                message: '用户登录已过期，请重新登录'
            })
        } else {
            conn.query('select * from user_info_list where ip_info =? AND id =?', [ip, decoded.id], (err, results) => {
                if (results != undefined && results.length >= 1) {
                    res.send({
                        code: 0,
                        ...decoded,
                        message: '用户在有效期'
                    })
                } else {
                    res.send({
                        code: 5,
                        message: '用户登录已过期，请重新登录'
                    })
                }
            });
        }
    })
}
const getUsers = function (body, res) {
    const {page, limit} = body;
    conn.query('select id,username,manager_name,user_type,workshop,times,last_login_time,password from user_info_list limit ?,?', [(page - 1) * limit, limit * 1], (err, results) => {
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
    const {username, password, manager_name, user_type, workshop, token} = body;
    jwt.verify(token, secret, function (err) {
        if (err) {
            res.send({
                code: 5,
                message: '用户登录已过期，请重新登录'
            })
        } else {
            conn.query('select * from user_info_list where username = ?', [username], (err, results) => {
                if (results.length == 0) {
                    conn.query('INSERT INTO user_info_list (username, password, manager_name, user_type,workshop) VALUES (?, ?, ?, ?,?)', [username, password, manager_name, user_type, workshop], (err, results) => {
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
    })
}
const editUser = function (body, res) {
    const {username, password, manager_name, user_type, workshop, editID, token} = body;
    jwt.verify(token, secret, function (err) {
        if (err) {
            res.send({
                code: 5,
                message: '用户登录已过期，请重新登录'
            })
        } else {
            conn.query('select * from user_info_list where username = ? and id != ?', [username, editID], (err, results) => {
                if (results.length == 0) {
                    conn.query('update user_info_list set username=?,password = ?,manager_name = ?,user_type = ?,workshop = ? where id=?', [username, password, manager_name, user_type, workshop, editID], (err, results) => {
                        if (err) return console.log(err.message)
                        res.send({
                            code: 0,
                            message: '用户已成功编辑',
                        });
                    })
                } else {
                    res.send({
                        code: 1,
                        message: '用户名已存在，请更改后重试',
                    });
                }
            });
        }
    })
}
const delUser = function (body, res) {
    const {token, del_id} = body;
    jwt.verify(token, secret, function (err, decoded) {
        if (err) {
            res.send({
                code: 5,
                message: '用户登录已过期，请重新登录'
            })
        } else {
            if (decoded.id * 1 == del_id * 1) {
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
    })
}
const addImage = function (body, image_name, url, res) {
    const {token} = body;
    jwt.verify(token, secret, function (err, decoded) {
        if (err) {
            res.send({
                code: 5,
                message: '用户登录已过期，请重新登录'
            })
        } else {
            conn.query('select * from image_info_list where image_name = ?', [image_name], (err, results) => {
                if (results.length == 0) {
                    conn.query('INSERT INTO image_info_list (image_name, manager_name, up_time,url) VALUES (?, ?, ?,?)', [image_name, '颜虎', new Date().getTime()
                        , url], (err, results) => {
                        if (err) return console.log(err.message)
                        res.send(
                            {
                                "code": 0
                                , "message": "上传成功"
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
    })
}
const getImages = function (body, res) {
    const {page, limit, image_name} = body;
    if (image_name === undefined) {
        conn.query('select id,image_name,url,up_time,manager_name from image_info_list order by id desc limit ?,?', [(page - 1) * limit, limit * 1], (err, results) => {
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
        conn.query('select id,image_name,url,up_time,manager_name from image_info_list where image_name like ? order by id desc limit ?,? ', ['%' + image_name + '%', (page - 1) * 10, limit * 1], (err, results) => {
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
    const {del_id, image_name, token} = body;
    jwt.verify(token, secret, function (err, decoded) {
        if (err) {
            res.send({
                code: 5,
                message: '用户登录已过期，请重新登录'
            })
        } else {
            conn.query('delete from image_info_list where id = ?', [del_id], (err, results) => {
                if (err) return console.log(err.message)
                fs.unlink('./uploads/' + image_name, function (error) {
                    if (error) {
                        console.log(error);
                        return false;
                    }
                    console.log('删除文件成功');
                })
                res.send({
                    code: 0,
                    message: '用户已删除',
                });
            })
        }
    });
}

module.exports = {login, isLogin, getUsers, addUser, delUser, addImage, getImages, delImage, editUser};