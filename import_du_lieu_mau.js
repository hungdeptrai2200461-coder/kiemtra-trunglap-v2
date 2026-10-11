const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const BaoCao = require('./models/bao_cao'); // Đường dẫn đến model Mongoose của bạn

async function importDuLieuMau() {
    try {
        // 1. Kết nối MongoDB
        await mongoose.connect('mongodb://localhost:27017/KiemTraTrungLap');
        console.log('✅ Đã kết nối MongoDB');

        // 2. Đường dẫn tới thư mục du_lieu_mau của bạn
        const folderPath = path.join(__dirname, 'restructuring_data', 'du_lieu_mau');

        if (!fs.existsSync(folderPath)) {
            console.error(`❌ Không tìm thấy thư mục: ${folderPath}`);
            process.exit(1);
        }

        // 3. Đọc danh sách file trong thư mục
        const files = fs.readdirSync(folderPath);
        console.log(`📁 Tìm thấy ${files.length} file trong thư mục du_lieu_mau`);

        let count = 0;
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            
            // Chỉ lấy file (bỏ qua nếu là thư mục con)
            if (fs.statSync(filePath).isFile()) {
                const idBaoCao = path.parse(file).name; // Lấy tên file làm ID

                // Kiểm tra xem báo cáo đã tồn tại trong DB chưa để tránh trùng lặp
                const existing = await BaoCao.findOne({ id_bao_cao: idBaoCao });
                if (!existing) {
                    await BaoCao.create({
                        id_bao_cao: idBaoCao,
                        tieu_de: idBaoCao,     // <-- ĐÃ THÊM: Thêm tiêu đề để không bị lỗi Validation
                        tep_tin: filePath,     // Đường dẫn tuyệt đối tới file
                        mau_kiem_tra: true     // Đánh dấu là báo cáo mẫu để script rebuild nhận diện
                    });
                    console.log(`➕ Đã thêm vào DB: ${idBaoCao}`);
                    count++;
                } else {
                    console.log(`⚠️ Đã tồn tại trong DB, bỏ qua: ${idBaoCao}`);
                }
            }
        }

        console.log(`🎉 Hoàn tất! Đã thêm mới ${count} file vào MongoDB.`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Lỗi import:', error);
        process.exit(1);
    }
}

importDuLieuMau();