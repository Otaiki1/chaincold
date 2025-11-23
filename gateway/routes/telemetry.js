const express = require('express');
const router = express.Router();
const controller = require('../controller/telemetry');

router.route('/')
  .post(controller.receiveTelemetry);

router.route('/batch/:shipmentKey')
  .get(controller.getBatchStatus);

module.exports = router;

