const express = require('express');
const router = express.Router();
const controller = require('../controller/shipment');
const attestationController = require('../controller/attestation');

// GET /shipment/:shipmentKey
router.route('/:shipmentKey')
  .get(controller.getShipment);

// GET /shipment/:shipmentKey/attestations
router.route('/:shipmentKey/attestations')
  .get(attestationController.getShipmentAttestations);

module.exports = router;

