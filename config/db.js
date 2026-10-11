const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config({
    path: require('path').resolve(__dirname, '../.env')
});
//require('dotenv').config();
const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ Thiếu MONGO_URI trong tệp .env — không biết phải nối vào cơ sở dữ liệu nào.');
    process.exit(1);
  }

  try {
    console.log("URI:", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    // In tên cơ sở dữ liệu ra màn hình. Máy chủ và worker phải cùng một tên;
    // khác nhau thì mỗi bên đọc ghi một nơi, bên kia nhìn vào thấy trống trơn.
    console.log(`✅ Kết nối MongoDB thành công — cơ sở dữ liệu: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;