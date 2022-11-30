// 数据库链接
const mysql = require('mysql');
const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'my_db_02'
})
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');
const {trimZ} = require("./tool");
const secret = 'YanchenImageManager';
const login = function (body, ip, res) {
    const {username, password} = body;
    conn.query('select manager_name,id,user_type,username,times,is_work from user_info_list where username =? AND password =?', [username, password], (err, results) => {
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
            if (cache.is_work === 1) {
                const rule = {...cache};
                rule.ip_info = ip;
                const times = rule.times ? rule.times + 1 : 1;
                conn.query('update user_info_list set ip_info=?,last_login_time = ?,times = ? where id=?', [ip, new Date().getTime(), times, cache.id]);
                jwt.sign(rule, secret, {expiresIn: "10h"}, function (err, token) {
                    //"Bearer" token前缀
                    token = token
                    //返回token
                    res.json({token, manager_name: cache.manager_name, message: '登录成功！', code: 0})
                })
            } else {
                res.send({
                    code: 3,
                    message: '您已被停用，请联系管理员',
                })
            }
        }
    })
}
const isLogin = function (body, ip, res) {
    const {token} = body;
    const work = function (decoded) {
        conn.query('select manager_name,user_type from user_info_list where  id =?', [decoded.id], (err, results) => {
            if (err) return console.log(err.message)
            if (results.length == 1) {
                const cache = results[0];
                const {manager_name, user_type} = cache;
                res.send({
                    code: 0,
                    manager_name,
                    user_type,
                })
            } else {
                res.send({
                    code: 3,
                    message: '用户数据异常，请联系管理员'
                })
            }
        });
    }
    verifyToken(token, ip, res, work);
}
const verifyToken = function (token, ip, res, work) {
    jwt.verify(token, secret, function (err, decoded) {
        if (err) {
            res.send({
                code: 5,
                message: '用户登录已过期，请重新登录'
            });
        } else {
            conn.query('select is_work,user_type from user_info_list where ip_info =? AND id =?', [ip, decoded.id], (err, results) => {
                if (results != undefined && results.length >= 1) {
                    if (results[0].user_type != decoded.user_type) {
                        res.send({
                            code: 5,
                            message: '您的用户权限，已变更，请登录后重试。',
                        })
                    } else if (results[0].is_work === 1) {
                        work(decoded);
                    } else {
                        res.send({
                            code: 3,
                            message: '您已被停用，请联系管理员',
                        })
                    }
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
const getUsers = function (req, res) {
    const {page, limit, token} = req.query;
    const work = function (decoded) {
        if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            conn.query('select id,username,manager_name,user_type,workshop,times,last_login_time,password,is_work from user_info_list limit ?,?', [(page - 1) * limit, limit * 1], (err, results) => {
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
    }
    verifyToken(token, req.ip, res, work);
}
const addUser = function (req, res) {
    const {username, password, manager_name, user_type, workshop, is_work, token} = req.body;
    const work = function (decoded) {
        if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            conn.query('select * from user_info_list where username = ?', [username], (err, results) => {
                if (results.length == 0) {
                    conn.query('INSERT INTO user_info_list (manager_id,username, password, manager_name, user_type,workshop,is_work) VALUES (?,?,?,?,?,?,?)', [decoded.id, username, password, manager_name, user_type, workshop, is_work], (err, results) => {
                        console.log('id1=', decoded.id, 'manager_name1=', decoded.manager_name);
                        if (err) return console.log(err.message)
                        console.log('id=', decoded.id, 'manager_name1=', decoded.manager_name);
                        res.send({
                            code: 0,
                            message: '用户新增成功',
                        });
                        conn.query('INSERT INTO actions_list (manager_name,manager_id,action_name,change_name,change_from,manage_time) VALUES (?,?,?,?,?,?)', [decoded.manager_name, decoded.id, '增加', manager_name, user_type == 1 ? '超级用户' : user_type == 2 ? '普通用户' : '生产用户', new Date().getTime()]);
                    })
                } else {
                    res.send({
                        code: 1,
                        message: '用户已存在',
                    });
                }
            });
        }
    }
    verifyToken(token, req.ip, res, work);
}
const editUser = function (req, res) {
    const {username, password, manager_name, user_type, workshop, editID, token, new_password, is_work} = req.body;
    const work = function (decoded) {
        if (username == undefined) {
            conn.query('select * from user_info_list where id =? AND password =?', [decoded.id, password], (err, results) => {
                if (results.length == 0) {
                    res.json({
                        code: 1,
                        message: '原密码错误',
                    });
                } else {
                    conn.query('update user_info_list set password = ? where id=?', [new_password, decoded.id], (err, results) => {
                        if (err) return console.log(err.message)
                        res.send({
                            code: 0,
                            message: '密码修改成功！',
                        });
                    })
                    conn.query('INSERT INTO actions_list (manager_name,manager_id,action_name,change_name,change_from,manage_time) VALUES (?,?,?,?,?,?)', [decoded.manager_name, decoded.id, '编辑', manager_name == null ? '修改自己登陆密码' : manager_name, user_type == 1 ? '超级用户' : user_type == 2 ? '普通用户' : user_type == 2 ? '生产用户' : '用户', new Date().getTime()]);
                }
            });

        } else if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            conn.query('select * from user_info_list where username = ? and id != ?', [username, editID], (err, results) => {
                if (results.length == 0) {
                    conn.query('update user_info_list set username=?,password = ?,manager_name = ?,user_type = ?,workshop = ?,is_work=? where id=?', [username, password, manager_name, user_type, workshop, is_work, editID], (err, results) => {
                        if (err) return console.log(err.message)
                        res.send({
                            code: 0,
                            message: '用户已成功编辑',
                        });
                    })
                    conn.query('INSERT INTO actions_list (manager_name,manager_id,action_name,change_name,change_from,manage_time) VALUES (?,?,?,?,?,?)', [decoded.manager_name, decoded.id, '编辑', manager_name, user_type == 1 ? '超级用户' : user_type == 2 ? '普通用户' : '生产用户', new Date().getTime()]);
                } else {
                    res.send({
                        code: 1,
                        message: '用户名已存在，请更改后重试',
                    });
                }
            });
        }
    }
    verifyToken(token, req.ip, res, work);
}
const delUser = function (req, res) {
    const {manager_name, user_type, token, del_id} = req.body;
    const work = function (decoded) {
        if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
            return false;
        }
        if (decoded.id * 1 == del_id * 1) {
            res.send({
                code: 1,
                message: '用户不能删除自己，请用另一超级管理员删除。',
            });
        } else if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            conn.query('delete from user_info_list where id = ?', [del_id], (err, results) => {
                if (err) return console.log(err.message)
                res.send({
                    code: 0,
                    message: '用户已删除',
                });
                conn.query('INSERT INTO actions_list (manager_name,manager_id,action_name,change_name,change_from,manage_time) VALUES (?,?,?,?,?,?)', [decoded.manager_name, decoded.id, '删除', manager_name, user_type == 1 ? '超级用户' : user_type == 2 ? '普通用户' : '生产用户', new Date().getTime()]);
            })
        }
    }
    verifyToken(token, req.ip, res, work);
}
const uploads = function (req, res) {
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
            const work = function (decoded) {
                const image_name = files.file.originalFilename;
                let oldPath = files.file.newFilename;
                if (decoded.user_type != 1 && decoded.user_type != 3) {
                    res.send({
                        code: 3,
                        message: '您已经没有权限浏览该页面'
                    });
                    return false;
                }
                conn.query('select count(*) count from image_info_list where image_name = ?', [image_name], (err, count) => {
                    if (err) return console.log(err.message)
                    if (count[0].count == 0) {
                        const name = './uploads/' + trimZ(image_name);
                        oldPath = './uploads/' + oldPath;
                        fs.rename(oldPath, name, function (err) {
                            if (err) {
                                console.error("改名失败" + err);
                            }
                        })
                        conn.query('select * from image_info_list where image_name = ?', [image_name], (err, results) => {
                            conn.query('INSERT INTO image_info_list (manager_id,image_name, manager_name, up_time,url) VALUES (?,?, ?, ?,?)', [decoded.id, image_name, '颜虎', new Date().getTime(), name], (err, results) => {
                                if (err) return console.log(err.message)
                                res.send(
                                    {
                                        "code": 0
                                        , "message": "上传成功"
                                    }
                                );
                                conn.query('INSERT INTO actions_list (manager_name,manager_id,action_name,change_name,change_from,manage_time) VALUES (?,?,?,?,?,?)', [decoded.manager_name, decoded.id, '增加', image_name, '图纸', new Date().getTime()]);
                            })
                        });
                    } else {
                        fs.unlink('./uploads/' + oldPath, function (error) {
                            if (error) {
                                console.log(error);
                                return false;
                            }
                        })
                        res.send({
                            code: 3,
                            message: image_name,
                        });
                    }
                })
            }
            verifyToken(fields.token, req.ip, res, work);
        }
    )
}
const getImages = function (req, res) {
    const {page = 1, limit = 10, image_name, token} = req.query;
    const work = function () {
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
                conn.query('select count(*) count from image_info_list where image_name like ?', ['%' + image_name + '%'], (err, count) => {
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
    verifyToken(token, req.ip, res, work);
}
const delImage = function (req, res) {
    const {del_id, image_name, token} = req.body;
    const work = function (decoded) {
        if (decoded.user_type != 1 && decoded.user_type != 3) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
            return false;
        }
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
                message: '图纸已删除',
            });
            conn.query('INSERT INTO actions_list (manager_name,manager_id,action_name,change_name,change_from,manage_time) VALUES (?,?,?,?,?,?)', [decoded.manager_name, decoded.id, '删除', image_name, '图纸', new Date().getTime()]);
        })
    }
    verifyToken(token, req.ip, res, work);
}
const getLogs = function (req, res) {
    const {page, limit, manager_id, token} = req.query;
    const work = function (decoded) {
        if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
            return false;
        }
        if (manager_id == undefined || manager_id == '') {
            conn.query('select id,manager_name,action_name,change_name,change_from,manage_time from actions_list  order by id desc limit ?,?', [(page - 1) * limit, limit * 1], (err, results) => {
                if (err) return console.log(err.message)
                conn.query('select count(*) count from actions_list', (err, count) => {
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
            conn.query('select id,manager_name,action_name,change_name,change_from,manage_time from actions_list where manager_id=? order by id desc limit ?,?', [manager_id, (page - 1) * limit, limit * 1], (err, results) => {
                if (err) return console.log(err.message)
                conn.query('select count(*) count from actions_list where manager_id=?', [manager_id], (err, count) => {
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
    verifyToken(token, req.ip, res, work);
}
module.exports = {
    login,
    getUsers,
    addUser,
    delUser,
    getImages,
    delImage,
    editUser,
    getLogs,
    uploads,
    isLogin,
};