const express = require('express');
const router = express.Router();

/* GET home page. */
const index = router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

const users = router.get('/users', function (req, res, next) {
    res.render('users', {title: 'Express'});
});

const images = router.get('/imagesShow', function (req, res, next) {
    res.render('images', {title: 'Express'});
});

const imagesManager = router.get('/imagesManager', function (req, res, next) {
    res.render('imagesManager', {title: 'Express'});
});

const actionsLogs = router.get('/actionsLogs', function (req, res, next) {
    res.render('actionsLogs', {title: 'Express'});
});

module.exports = {index, users, images, imagesManager, actionsLogs};
