const express = require('express');
const router = express.Router();
const controller = require('../controller/attestation');

// GET /attestation/:taskId
router.route('/:taskId')
  .get(controller.getAttestation);

// POST /verify (manual verification)
router.route('/verify')
  .post(controller.verifyShipment);

module.exports = router;

