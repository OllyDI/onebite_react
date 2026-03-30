const { DataTypes } = require('sequelize');
const sequelize = require('./db.js');
const User = require('./db_user.js');

const diaryTable = sequelize.define('Diary', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    createdDate: {
        type: DataTypes.DATE,
        field: 'createdDate',
        allowNull: true,
    },
    emotionId: {
        type: DataTypes.INTEGER,
        field: 'emotionId',
        allowNull: true,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
    tableName: 'diaries',
    timestamps: false,
})

diaryTable.belongsTo(User, {
    foreignKey: 'user_id',
    onUpdate: 'CASCADE',
})
User.hasMany(diaryTable, {
    foreignKey: 'user_id',
})

module.exports = diaryTable