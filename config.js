// 数据库链接
const mysql = require('mysql');
const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'my_db_02'
})

const login = function (username, password, res) {
    conn.query('select * from user_info_list where username =? AND password =?', [username, password], (err, results) => {
        if (err) return console.log(err.message)
        let result = {};
        if (results.length == 0) {
            result = {
                code: 0,
                message: '用户名密码错误'
            }
        } else {
            result = {
                code: 1,
                message: '用户名密码正确'
            }
        }
        res.send(result);
    })
}


module.exports = {login};