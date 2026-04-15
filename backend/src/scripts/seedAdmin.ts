import prisma from '../config/database.js';
import { hashPassword } from '../utils/passwordHash.js';

async function seedAdmin() {
  try {
    const adminExists = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (adminExists) {
      console.log('Admin user already exists:', adminExists.username);
      return;
    }

    const passwordHash = await hashPassword('admin123');

    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@kanadojo.com',
        passwordHash,
        role: 'admin'
      }
    });

    console.log('✓ Admin user created successfully!');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  Email:', admin.email);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
