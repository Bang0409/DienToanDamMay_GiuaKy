const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  productCode: {
    type: String,
    required: true
  },

  title: {
    type: String,
    required: true
  },

  author: {
    type: String,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  priceAfterVAT: {
    type: Number,
    required: true
  }
});

module.exports = bookSchema;