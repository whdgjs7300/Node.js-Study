const { MongoClient } = require('mongodb');

const url = 'mongodb+srv://whdgjs7300:qwer1234@cluster0.ef3bhk8.mongodb.net/?retryWrites=true&w=majority'
let connectDB = new MongoClient(url).connect()

module.exports = connectDB 