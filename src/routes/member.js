const express = require('express');
const db = require(__dirname + '../db_connect2');
const router = express.Router();

router.use((req, res, next)=>{
    if(!req.session.users){
        res.redirect('/login');
    } else {
        next();
    }
});

router.get('/camera', (req, res) => {
    res.redirect('camera');
});

module.exports = router;