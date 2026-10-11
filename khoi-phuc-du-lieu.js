/**
 * ============================================================================
 * KHÔI PHỤC DỮ LIỆU VÀO MONGODB
 *
 * Cách dùng: chép tệp này và tệp du-lieu-day-du.jsonl.gz vào thư mục dự án
 * (để cạnh server.js), rồi mở cửa sổ lệnh tại đó và gõ:
 *
 *     node khoi-phuc-du-lieu.js
 *
 * Không cần cài thêm phần mềm nào. Tệp này chỉ dùng những thư viện đã có sẵn
 * trong thư mục dự án.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
require('dotenv').config();

const TEP = path.join(__dirname, 'du-lieu-day-du.jsonl.gz');
const URI = process.env.MONGO_URI || 'mongodb://localhost:27017/KiemTraTrungLap';
const LO = 1000;

async function main() {
    if (!fs.existsSync(TEP)) {
        console.error(`\n❌ Không thấy tệp dữ liệu: ${TEP}`);
        console.error('   Chép tệp du-lieu-day-du.jsonl.gz vào cùng thư mục với tệp này rồi chạy lại.\n');
        process.exit(1);
    }

    await mongoose.connect(URI);
    const db = mongoose.connection.db;
    console.log(`\nĐang nối vào cơ sở dữ liệu: ${mongoose.connection.name}`);

    // Đếm trước khi nạp, để so sánh về sau
    const truoc = {};
    for (const c of await db.listCollections().toArray()) {
        truoc[c.name] = await db.collection(c.name).countDocuments();
    }
    const tongTruoc = Object.values(truoc).reduce((a, b) => a + b, 0);
    console.log(`Hiện đang có: ${tongTruoc} bản ghi / ${Object.keys(truoc).length} bảng\n`);

    console.log('Bắt đầu nạp...\n');

    const dong = readline.createInterface({
        input: fs.createReadStream(TEP).pipe(zlib.createGunzip()),
        crlfDelay: Infinity
    });

    const daXoa = new Set();
    let bangHienTai = null;
    let cho = [];
    let demBang = 0;
    let tong = 0;

    const doLo = async () => {
        if (!cho.length) return;
        await db.collection(bangHienTai).insertMany(cho, { ordered: false });
        tong += cho.length;
        demBang += cho.length;
        cho = [];
    };

    for await (const d of dong) {
        if (!d.trim()) continue;
        const { _bang, _bg } = EJSON.parse(d);

        if (_bang !== bangHienTai) {
            await doLo();
            if (bangHienTai) {
                console.log(`   ${bangHienTai.padEnd(30)} ${String(demBang).padStart(7)} bản ghi`);
            }
            bangHienTai = _bang;
            demBang = 0;
        }

        // Xoá sạch bảng cũ ở lần gặp đầu tiên, tránh nạp chồng lên dữ liệu cũ
        if (!daXoa.has(_bang)) {
            await db.collection(_bang).deleteMany({});
            daXoa.add(_bang);
        }

        cho.push(_bg);
        if (cho.length >= LO) await doLo();
    }

    await doLo();
    if (bangHienTai) {
        console.log(`   ${bangHienTai.padEnd(30)} ${String(demBang).padStart(7)} bản ghi`);
    }

    // Đếm lại để tự kiểm chứng, không tin vào số đã nạp
    console.log('\nĐếm lại trong cơ sở dữ liệu:\n');
    let tongSau = 0;
    const ten = (await db.listCollections().toArray()).map(c => c.name).sort();
    for (const t of ten) {
        const n = await db.collection(t).countDocuments();
        tongSau += n;
        console.log(`   ${t.padEnd(30)} ${String(n).padStart(7)} bản ghi`);
    }

    console.log(`\n   TỔNG: ${tongSau} bản ghi / ${ten.length} bảng`);
    console.log(tongSau === tong
        ? '\n✅ Khôi phục xong, số liệu khớp.\n'
        : `\n⚠️ Đã nạp ${tong} nhưng đếm được ${tongSau} — chênh lệch, báo lại để kiểm tra.\n`);

    await mongoose.disconnect();
}

main().catch(async e => {
    console.error('\n❌ Lỗi khi khôi phục:', e.message);
    console.error('   Chụp màn hình dòng báo lỗi này gửi lại.\n');
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
});
