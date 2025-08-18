import 'reflect-metadata';
import { AppDataSource } from '@/utils/database';
import { User } from '@/models';
import { In, IsNull, Not } from 'typeorm';

async function fixUnknownDisplayNames() {
	console.log('🛠️ เริ่มแก้ไขชื่อผู้ใช้ที่เป็น "ไม่ทราบ" ในฐานข้อมูล...');
	try {
		await AppDataSource.initialize();
		console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');

		const userRepo = AppDataSource.getRepository(User);

		// หา users ที่ displayName เป็น 'ไม่ทราบ', 'ผู้ใช้ไม่ทราบชื่อ', ว่าง หรือ null
		const candidates = await userRepo.find({
			where: [
				{ displayName: In(['ไม่ทราบ', 'ผู้ใช้ไม่ทราบชื่อ', '']) },
				{ displayName: IsNull() as any }
			]
		});

		if (candidates.length === 0) {
			console.log('ℹ️ ไม่พบผู้ใช้ที่ต้องแก้ไข');
			return;
		}

		console.log(`📊 พบผู้ใช้ที่ต้องแก้ไข: ${candidates.length} รายการ`);

		let updatedCount = 0;
		for (const user of candidates) {
			const prefix = (user.lineUserId || user.id || '').toString().slice(0, 8) || '00000000';
			user.displayName = `User ${prefix}`;
			await userRepo.save(user);
			updatedCount += 1;
		}

		console.log(`✅ อัปเดตชื่อผู้ใช้สำเร็จ: ${updatedCount}/${candidates.length} รายการ`);
	} catch (error) {
		console.error('❌ เกิดข้อผิดพลาดระหว่างการแก้ไขชื่อผู้ใช้:', error);
		process.exitCode = 1;
	} finally {
		if (AppDataSource.isInitialized) {
			await AppDataSource.destroy();
			console.log('🔌 ปิดการเชื่อมต่อฐานข้อมูลแล้ว');
		}
	}
}

// Run if called directly
if (require.main === module) {
	fixUnknownDisplayNames();
}

export { fixUnknownDisplayNames };
