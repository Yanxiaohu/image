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
/** 登录验证 **/
const login = function (body, ip, res) {
    const {username, password} = body;
    conn.query(`select manager_name, id, user_type, username, times, is_work, from_factory_id
                from user_info_list
                where username = ?
                  AND password = ?`, [username, password], (err, results) => {
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
        conn.query('select manager_name,user_type,from_factory_id from user_info_list where  id =?', [decoded.id], (err, results) => {
            if (err) return console.log(err.message)
            if (results.length == 1) {
                const cache = results[0];
                const {manager_name, user_type, from_factory_id} = cache;
                if (user_type == 1) {
                    conn.query('select count(*) count from apply_list where  is_agree = 1 ', (err, count) => {
                        if (err) return console.log(err.message)
                        res.send({
                            code: 0,
                            manager_name,
                            user_type,
                            un_read_count: count[0].count,
                            from_factory_id
                        })
                    })
                } else {
                    res.send({
                        code: 0,
                        manager_name,
                        user_type,
                        from_factory_id
                    })
                }
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
/** 用户操作 **/
const getUsers = function (req, res) {
    const {page, limit, token} = req.query;
    const cachePage = (page - 1) * limit, cacheLimit = limit * 1;
    const work = function (decoded) {
        if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            conn.query(`select u.id,
                               u.username,
                               u.manager_name,
                               u.user_type,
                               u.times,
                               u.last_login_time,
                               u.password,
                               u.is_work,
                               u.workshop_id,
                               u.from_factory_id,
                               f.from_factory,
                               w.workshop
                        from user_info_list u
                                 left outer join
                        workshop_info_list w
                        on u.workshop_id = w.id
                                 left outer join
                        factory_info_list f
                        on u.from_factory_id = f.id
                            limit ${cachePage}
                           , ${cacheLimit}`, (err, results) => {
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
    const {username, password, manager_name, user_type, workshop_id, from_factory_id, is_work, token} = req.body;
    const work = function (decoded) {
        if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            conn.query('select * from user_info_list where username = ?', [username], (err, results) => {
                if (results.length == 0) {
                    conn.query('INSERT INTO user_info_list (manager_id,username, password, manager_name, user_type,is_work,workshop_id,from_factory_id) VALUES (?,?,?,?,?,?,?,?)', [decoded.id, username, password, manager_name, user_type, is_work, workshop_id, from_factory_id], (err, results) => {
                        if (err) return console.log(err.message)
                        res.send({
                            code: 0,
                            message: '用户新增成功',
                        });
                        addLogs(decoded.manager_name, decoded.id, '增加', manager_name, user_type == 1 ? '超级用户' : user_type == 2 ? '普通用户' : '生产用户');
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
    const {
        username,
        password,
        manager_name,
        user_type,
        workshop_id,
        from_factory_id,
        editID,
        token,
        new_password,
        is_work
    } = req.body;
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
                    addLogs(decoded.manager_name, decoded.id, '编辑', manager_name == null ? '修改自己登陆密码' : manager_name, user_type == 1 ? '超级用户' : user_type == 2 ? '普通用户' : user_type == 2 ? '生产用户' : '用户')
                }
            });
        } else if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            console.log(username, editID);
            conn.query('select * from user_info_list where username = ? and id != ?', [username, editID], (err, results) => {
                if (results.length == 0) {
                    conn.query('update user_info_list set username=?,password = ?,manager_name = ?,user_type = ?,workshop_id=?,from_factory_id=?,is_work=? where id=?', [username, password, manager_name, user_type, workshop_id, from_factory_id, is_work, editID * 1], (err, results) => {
                        if (err) return console.log(err.message)
                        res.send({
                            code: 0,
                            message: '用户已成功编辑',
                        });
                    })
                    addLogs(decoded.manager_name, decoded.id, '编辑', manager_name, user_type == 1 ? '超级用户' : user_type == 2 ? '普通用户' : '生产用户');
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
                addLogs(decoded.manager_name, decoded.id, '删除', manager_name, user_type == 1 ? '超级用户' : user_type == 2 ? '普通用户' : '生产用户');
            })
        }
    }
    verifyToken(token, req.ip, res, work);
}
/** 图纸操作 **/
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
                            conn.query('INSERT INTO image_info_list (manager_id,image_name, manager_name, up_time,url,from_factory_id) VALUES (?,?, ?, ?,?,?)', [decoded.id, image_name, decoded.manager_name, new Date().getTime(), name, decoded.from_factory_id], (err, results) => {
                                if (err) return console.log(err.message)
                                res.send(
                                    {
                                        "code": 0
                                        , "message": "上传成功"
                                    }
                                );
                                addLogs(decoded.manager_name, decoded.id, '增加', image_name, '图纸');
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
    const {page = 1, limit = 10, image_name, token, from_factory_id} = req.query;
    const cachePage = (page - 1) * limit;
    const cacheLimit = limit * 1;
    const cache_from_factory_id = from_factory_id * 1;
    const work = function (decoded) {
        let ImageListSql = `select i.id, i.image_name, i.url, i.up_time, i.manager_name, f.from_factory
                            from image_info_list i,
                                 factory_info_list f
                            where i.from_factory_id = f.id`;
        let imagesCountSql = `select count(*) count
                              from image_info_list`;
        const limit = `order by id desc limit ${cachePage}, ${cacheLimit}`;
        if (from_factory_id != undefined) {
            if (image_name === undefined) {
                ImageListSql = `${ImageListSql}  and i.from_factory_id = ${cache_from_factory_id} ${limit}`;
                imagesCountSql = `${imagesCountSql}  where from_factory_id = ${cache_from_factory_id}`;
            } else {
                ImageListSql = `${ImageListSql}  and i.from_factory_id = ${from_factory_id}  and image_name like "%${image_name}%" ${limit}`;
                imagesCountSql = `${imagesCountSql}  where from_factory_id = ${from_factory_id} and image_name like "%${image_name}%"`;
            }
        } else if (image_name === undefined) {
            if (decoded.user_type != 1) {
                ImageListSql = `${ImageListSql}
                                  and i.from_factory_id = ${decoded.from_factory_id}
                                ${limit}`
                imagesCountSql = `${imagesCountSql}
                                  where from_factory_id =${decoded.from_factory_id}`
            } else {
                ImageListSql = `${ImageListSql}
                                ${limit}`
                imagesCountSql = `${imagesCountSql}`
            }
        } else {
            if (decoded.user_type != 1) {
                ImageListSql = `${ImageListSql}
                                  and i.from_factory_id = ${decoded.from_factory_id}
                                  and image_name like "%${image_name}%"
                                ${limit}`;
                imagesCountSql = `${imagesCountSql}
                                  where from_factory_id =${decoded.from_factory_id}
                                    and image_name like "%${image_name}%"`;
            } else {
                ImageListSql = `${ImageListSql}
                                  and image_name like "%${image_name}%"
                                    ${limit}`;
                imagesCountSql = `${imagesCountSql}
                                  where image_name like "%${image_name}%"`;
            }
        }
        conn.query(ImageListSql, (err, results) => {
            if (err) return console.log(err.message)
            conn.query(imagesCountSql, (err, count) => {
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
            fs.unlink('./uploads/' + trimZ(image_name), function (error) {
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
            addLogs(decoded.manager_name, decoded.id, '删除', image_name, '图纸',);
        })
    }
    verifyToken(token, req.ip, res, work);
}
/** 日志操作 **/
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
const addLogs = function (manager_name, manager_id, action_name, change_name, change_from) {
    conn.query('INSERT INTO actions_list (manager_name,manager_id,action_name,change_name,change_from,manage_time) VALUES (?,?,?,?,?,?)', [manager_name, manager_id, action_name, change_name, change_from, new Date().getTime()]);
}
/** 模块操作 **/
const getFactories = function (req, res) {
    const {page, limit, token} = req.query;
    const work = function (decoded) {
        if (decoded.user_type != 1 && limit != 100) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            conn.query('select id,manager_name,from_factory,manage_time from factory_info_list limit ?,?', [(page - 1) * limit, limit * 1], (err, results) => {
                if (err) return console.log(err.message)
                conn.query('select count(*) count from factory_info_list', (err, count) => {
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
const addFactory = function (req, res) {
    const {from_factory, token} = req.body;
    const work = function (decoded) {
        if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            conn.query('select * from factory_info_list where from_factory = ?', [from_factory], (err, results) => {
                if (results.length == 0) {
                    conn.query('INSERT INTO factory_info_list (manager_id,manager_name,from_factory,manage_time) VALUES (?,?,?,?)', [decoded.id, decoded.manager_name, from_factory, new Date().getTime()], (err, results) => {
                        if (err) return console.log(err.message)
                        res.send({
                            code: 0,
                            message: '模块新增成功',
                        });
                        addLogs(decoded.manager_name, decoded.id, '增加', from_factory, '模块');
                    })
                } else {
                    res.send({
                        code: 1,
                        message: '模块名已存在，请更换',
                    });
                }
            });
        }
    }
    verifyToken(token, req.ip, res, work);
}
const editFactory = function (req, res) {
    const {editID, from_factory, token} = req.body;
    const work = function (decoded) {
        if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            conn.query('select * from factory_info_list where from_factory = ? and id != ?', [from_factory, editID], (err, results) => {
                if (results.length == 0) {
                    conn.query('update factory_info_list set from_factory=? where id=?', [from_factory, editID], (err, results) => {
                        if (err) return console.log(err.message)
                        res.send({
                            code: 0,
                            message: '模块成功编辑',
                        });
                    })
                    addLogs(decoded.manager_name, decoded.id, '编辑', from_factory, '模块');
                } else {
                    res.send({
                        code: 1,
                        message: '模块名已存在，请更改后重试',
                    });
                }
            });
        }
    }
    verifyToken(token, req.ip, res, work);
}
const delFactory = function (req, res) {
    const {token, from_factory, del_id} = req.body;
    const work = function (decoded) {
        if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            conn.query('select count(*) count from workshop_info_list where from_factory_id = ?', [del_id], (err, count) => {
                if (err) return console.log(err.message)
                if (count[0].count == 0) {
                    conn.query('delete from factory_info_list where id = ?', [del_id * 1], (err, results) => {
                        console.log(results);
                        if (err) return console.log(err.message)
                        res.send({
                            code: 0,
                            message: '模块已删除',
                        });
                        addLogs(decoded.manager_name, decoded.id, '删除', from_factory, '模块');
                    })
                } else {
                    res.send({
                        code: 3,
                        message: '有下属部门尚未删除，请删除下属部门',
                    });
                }
            })
        }
    }
    verifyToken(token, req.ip, res, work);
}
const addWorkshop = function (req, res) {
    const {from_factory_id, workshop, token, from_factory} = req.body;
    const work = function (decoded) {
        if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            conn.query('select * from workshop_info_list where workshop = ? and from_factory_id =?', [workshop, from_factory_id], (err, results) => {
                if (results.length == 0) {
                    conn.query('INSERT INTO workshop_info_list (manager_id,manager_name,workshop,manage_time,from_factory_id,from_factory) VALUES (?,?,?,?,?,?)', [decoded.id, decoded.manager_name, workshop, new Date().getTime(), from_factory_id, from_factory], (err, results) => {
                        if (err) return console.log(err.message)
                        res.send({
                            code: 0,
                            message: '部门新增成功',
                        });
                        addLogs(decoded.manager_name, decoded.id, '增加', workshop, '部门');
                    })
                } else {
                    res.send({
                        code: 1,
                        message: '部门名已存在，请更换',
                    });
                }
            });
        }
    }
    verifyToken(token, req.ip, res, work);
}
const getWorkshops = function (req, res) {
    const {page, limit, token, from_factory_id} = req.query;
    const work = function (decoded) {
        if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            if (from_factory_id == '' || from_factory_id == null) {
                conn.query(`select w.id, w.workshop, f.from_factory, w.from_factory_id, w.manage_time, w.manager_name
                            from workshop_info_list w
                                     left outer join
                                 factory_info_list f
                                 on w.from_factory_id = f.id limit ?, ?`, [(page - 1) * limit, limit * 1], (err, results) => {
                    if (err) return console.log(err.message)
                    conn.query('select count(*) count from workshop_info_list', (err, count) => {
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
                console.log('from_factory_id=', from_factory_id);
                conn.query(`select w.id, w.workshop, f.from_factory, w.from_factory_id, w.manage_time, w.manager_name
                            from workshop_info_list w
                                     left outer join
                                 factory_info_list f
                                 on w.from_factory_id = f.id
                            where w.from_factory_id = ? limit ?,?`, [from_factory_id, (page - 1) * limit, limit * 1], (err, results) => {
                    if (err) return console.log(err.message)
                    conn.query('select count(*) count from workshop_info_list where from_factory_id = ?', [from_factory_id], (err, count) => {
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
    }
    verifyToken(token, req.ip, res, work);
}
const editWorkshop = function (req, res) {
    const {editID, workshop, token, from_factory_id} = req.body;
    const work = function (decoded) {
        if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            conn.query('select * from workshop_info_list where workshop = ? and id != ? and from_factory_id = ? ', [workshop, editID, from_factory_id], (err, results) => {
                if (results.length == 0) {
                    conn.query('update workshop_info_list set workshop=? where id=?', [workshop, editID], (err, results) => {
                        if (err) return console.log(err.message)
                        res.send({
                            code: 0,
                            message: '部门成功编辑',
                        });
                    })
                    addLogs(decoded.manager_name, decoded.id, '编辑', workshop, '部门');
                } else {
                    res.send({
                        code: 1,
                        message: '名已存在，请更改后重试',
                    });
                }
            });
        }
    }
    verifyToken(token, req.ip, res, work);
}
const delWorkshop = function (req, res) {
    const {token, from_factory, del_id} = req.body;
    const work = function (decoded) {
        if (decoded.user_type != 1) {
            res.send({
                code: 3,
                message: '您已经没有权限浏览该页面'
            });
        } else {
            conn.query('select count(*) count from user_info_list where workshop_id = ?', [del_id], (err, count) => {
                if (err) return console.log(err.message)
                if (count[0].count >= 1) {
                    res.send({
                        code: 3,
                        message: '部门有下属人员，不能删除',
                    });
                } else {
                    conn.query('delete from workshop_info_list where id = ?', [del_id * 1], (err, results) => {
                        if (err) return console.log(err.message)
                        res.send({
                            code: 0,
                            message: '部门已删除',
                        });
                        addLogs(decoded.manager_name, decoded.id, '删除', from_factory, '部门');
                    })
                }
            });
        }
    }
    verifyToken(token, req.ip, res, work);
}
/** 文件权限 **/
const fileRead = function (req, res, pathStr) {
    res.sendFile(pathStr + "/" + req.url);
}
const imageRead = function (req, res) {
    const {token, id} = req.query;
    const work = function (decoded) {
        const {user_type, from_factory_id: factory_id} = decoded;
        conn.query('select url ,from_factory_id from image_info_list  where id = ?', [id], (err, result) => {
            if (err) return console.log(err.message)
            const {url, from_factory_id} = result[0];
            // if (factory_id == from_factory_id || user_type == 1) {
            res.send(
                {
                    code: 0,
                    url,
                }
            );
            // } else {
            //     conn.query('select gree_time ,duration,is_agree from apply_list  where apply_id = ?', [decoded.id], (err, result1) => {
            //         if (err) return console.log(err.message)
            //         if (result1.length > 0) {
            //             const {duration, is_agree} = result1[0];
            //             const endTime = duration * 1 - new Date().getTime();
            //             if (is_agree == 2 && endTime > 0) {
            //                 res.send(
            //                     {
            //                         code: 0,
            //                         url,
            //                         endTime
            //                     }
            //                 );
            //             } else {
            //                 res.send(
            //                     {
            //                         code: 7,
            //                         message: '您没有权限，查看该图纸是否申请查看？',
            //                     });
            //             }
            //         } else {
            //             res.send(
            //                 {
            //                     code: 7,
            //                     message: '您没有权限，查看该图纸是否申请查看？',
            //                 });
            //         }
            //     })
            //
            // }
        });
    }
    verifyToken(token, req.ip, res, work);
}
const apply = function (req, res) {
    const {token} = req.body;
    const work = function (decoded) {
        const {id} = decoded;
        conn.query('select count(*) count from apply_list where apply_id = ?', [id], (err, results) => {
            if (err) return console.log(err.message)
            if (results[0].count >= 1) {
                conn.query('update apply_list set is_agree=?,apply_time=?,manager_id=?  where apply_id=?', [1, new Date().getTime(), null, id * 1], (err, results) => {
                    if (err) return console.log(err.message)
                    res.send({
                        code: 0,
                        message: '已成功发起申请1'
                    });
                })
            } else {
                conn.query('INSERT INTO apply_list (apply_id,apply_time,is_agree) VALUES (?,?,?)', [id, new Date().getTime(), 1], (err, result) => {
                    if (err) return console.log(err.message)
                    res.send({
                        code: 0,
                        message: '已成功发起申请2',
                    });
                    addLogs(decoded.manager_name, decoded.id, '发起', '申请', '图纸');
                })
            }
        });

    }
    verifyToken(token, req.ip, res, work);
}
const getApply = function (req, res) {
    const {page, limit, token} = req.query;
    const work = function () {
        conn.query(`select a.id,
                           u.manager_name apply_name,
                           a.apply_time,
                           a.is_agree,
                           a.duration,
                           u1.manager_name
                    from apply_list a
                             inner join user_info_list u
                                        on a.apply_id = u.id
                             left outer join user_info_list u1
                                             on a.manager_id = u1.id
                    order by a.is_agree limit ?, ?`, [(page - 1) * limit, limit * 1], (err, results) => {
            if (err) return console.log(err.message)
            conn.query('select count(*) count from apply_list', (err, count) => {
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
    verifyToken(token, req.ip, res, work);
}
const editApply = function (req, res) {
    const {id, is_agree, duration, token} = req.body;
    let cacheDuration = duration * 1 * 3600000 + new Date().getTime();
    if (duration == null) {
        cacheDuration = 0;
    }
    const work = function (decoded) {
        conn.query('update apply_list set is_agree=?,manager_id=?,duration=?,gree_time=? where id=?', [is_agree, decoded.id, cacheDuration, new Date().getTime(), id * 1,], (err, results) => {
            if (err) return console.log(err.message)
            res.send({
                code: 0,
                message: '操作成功'
            });
        })
    }
    verifyToken(token, req.ip, res, work);
}

const selectInfoFromParentID = function (req, res) {
    const {id, token} = req.query;
    const work = function () {
        conn.query(`SELECT l.image_name,
                           l.url,
                           l.up_time,
                           l.manager_name,
                           f.from_factory
                    FROM image_bom_sub s
                             LEFT JOIN image_info_list l ON s.image_id = l.id
                             LEFT JOIN factory_info_list f on l.from_factory_id = f.id
                    WHERE s.parent_id = ?
        `, [id], (err, results) => {
            if (err) return console.log(err.message)
            res.send({
                code: 0,
                data: results,
                message: '操作成功'
            });
        })
    }
    verifyToken(token, req.ip, res, work);
}
const addSubImage = function (req, res) {
    const {image_id, parent_id, token} = req.body;
    const work = function () {
        conn.query(`SELECT COUNT(*) count
                    FROM image_bom_sub
                    WHERE parent_id = ?
                      AND image_id = ?`, [parent_id, image_id], (err, results) => {
            if (err) return console.log(err.message)
            console.log(results);
            if (results[0].count == 0) {
                conn.query(`INSERT INTO image_bom_sub(image_id, parent_id)
                            VALUES (?, ?)`, [image_id, parent_id], (err, results) => {
                    if (err) return console.log(err.message)
                    res.send({
                        code: 0,
                        message: '操作成功'
                    });
                })
            } else {
                res.send({
                    code: 3,
                    message: '不能重复添加子图'
                });
            }
        });

    }
    verifyToken(token, req.ip, res, work);
}

const delSubImage = function (req, res) {
    const {token, bom_id, id} = req.body;
    const work = function (decoded) {
        conn.query(`delete
                    from image_bom_sub
                    where image_id = ?
                      and parent_id = ?`, [id, bom_id], (err, results) => {
            if (err) return console.log(err.message)
            res.send({
                code: 0,
                message: '子表数据已删除',
            });
        })
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
    getFactories,
    addFactory,
    editFactory,
    delFactory,
    addWorkshop,
    getWorkshops,
    editWorkshop,
    delWorkshop,
    fileRead,
    imageRead,
    apply, getApply, editApply, selectInfoFromParentID, addSubImage, delSubImage
};
