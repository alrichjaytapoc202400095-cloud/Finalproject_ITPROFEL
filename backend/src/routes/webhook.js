// The webhook router is mounted BEFORE express.json() so the raw body survives
// for signature verification (S-07).
const express = require('express');
const wrap = require('../patterns/decorator/wrap');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.post('/payments/webhook', express.raw({ type: '*/*', limit: '256kb' }), wrap(paymentController.webhook));

module.exports = router;
