const express = require('express');
const router = express.Router();

/* GET home page. */
const index = router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

const users = router.get('/users', function (req, res, next) {
    res.send('respond with a resource');
});

module.exports = {index, users};
