const { Sequelize } = require('sequelize');
const pg = require('pg');
// require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'postgres',
    dialectModule: pg,
    protocol: "postgres",
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        }, 
        keepAlive: true,
    },

    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
        evict: 10000,
    },
});

async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log('SQL 연결 성공');
  } catch (err) {
    console.error('SQL 연결 실패, 재시도...', err);
    setTimeout(connectDB, 5000);
  }
}

connectDB();
module.exports = sequelize;