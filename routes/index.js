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

const imagesUpload = router.get('/imagesUpload', function (req, res, next) {
    res.render('imagesUpload', {title: 'Express'});
});
const factories = router.get('/factories', function (req, res, next) {
    res.render('factories', {title: 'Express'});
});
const workshop = router.get('/workshop', function (req, res, next) {
    res.render('workshop', {title: 'Express'});
});
const pageApply = router.get('/apply', function (req, res, next) {
    res.render('apply', {title: 'Express'});
});
module.exports = {index, users, images, imagesManager, actionsLogs, imagesUpload, factories, workshop, pageApply};
