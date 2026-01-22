import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...\n');
    // Create demo clinic
    const clinic = await prisma.clinic.upsert({
        where: { subdomain: 'demo' },
        update: {},
        create: {
            name: 'Demo Dental Clinic',
            tradeName: 'Demo Dental',
            cnpj: '12345678000190',
            email: 'demo@dpm.local',
            phone: '11999999999',
            subdomain: 'demo',
            timezone: 'America/Sao_Paulo',
            address: {
                street: 'Rua Demo',
                number: '123',
                neighborhood: 'Centro',
                city: 'São Paulo',
                state: 'SP',
                zipCode: '01000000',
            },
            settings: {
                appointmentDuration: 30,
                operatingHours: {
                    monday: { enabled: true, start: '08:00', end: '18:00' },
                    tuesday: { enabled: true, start: '08:00', end: '18:00' },
                    wednesday: { enabled: true, start: '08:00', end: '18:00' },
                    thursday: { enabled: true, start: '08:00', end: '18:00' },
                    friday: { enabled: true, start: '08:00', end: '18:00' },
                    saturday: { enabled: true, start: '08:00', end: '12:00' },
                    sunday: { enabled: false },
                },
            },
        },
    });
    console.log(`✅ Created clinic: ${clinic.name}`);
    // Create admin user
    const adminPassword = await bcrypt.hash('Admin@123', 12);
    const adminUser = await prisma.user.upsert({
        where: { clinicId_email: { clinicId: clinic.id, email: 'admin@demo.dpm.local' } },
        update: {},
        create: {
            clinicId: clinic.id,
            email: 'admin@demo.dpm.local',
            passwordHash: adminPassword,
            name: 'Admin User',
            role: 'ADMIN',
        },
    });
    console.log(`✅ Created admin user: ${adminUser.email}`);
    // Create dentist user
    const dentistPassword = await bcrypt.hash('Dentist@123', 12);
    const dentistUser = await prisma.user.upsert({
        where: { clinicId_email: { clinicId: clinic.id, email: 'dentist@demo.dpm.local' } },
        update: {},
        create: {
            clinicId: clinic.id,
            email: 'dentist@demo.dpm.local',
            passwordHash: dentistPassword,
            name: 'Dr. João Silva',
            role: 'DENTIST',
        },
    });
    // Create professional profile for dentist
    const professional = await prisma.professional.upsert({
        where: { userId: dentistUser.id },
        update: {},
        create: {
            clinicId: clinic.id,
            userId: dentistUser.id,
            name: 'Dr. João Silva',
            cro: '12345',
            croState: 'SP',
            specialty: 'General Dentistry',
            color: '#3B82F6',
            workingHours: {
                monday: { enabled: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
                tuesday: { enabled: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
                wednesday: { enabled: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
                thursday: { enabled: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
                friday: { enabled: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
                saturday: { enabled: false },
                sunday: { enabled: false },
            },
            commissionType: 'PERCENTAGE',
            commissionValue: 50,
        },
    });
    console.log(`✅ Created dentist: ${dentistUser.email}`);
    // Create receptionist user
    const receptionistPassword = await bcrypt.hash('Reception@123', 12);
    const receptionistUser = await prisma.user.upsert({
        where: { clinicId_email: { clinicId: clinic.id, email: 'reception@demo.dpm.local' } },
        update: {},
        create: {
            clinicId: clinic.id,
            email: 'reception@demo.dpm.local',
            passwordHash: receptionistPassword,
            name: 'Maria Santos',
            role: 'RECEPTIONIST',
        },
    });
    console.log(`✅ Created receptionist: ${receptionistUser.email}`);
    // Create rooms
    const room1 = await prisma.room.upsert({
        where: { id: 'room-1' },
        update: {},
        create: {
            id: 'room-1',
            clinicId: clinic.id,
            name: 'Room 1',
            description: 'Main treatment room',
            color: '#3B82F6',
        },
    });
    const room2 = await prisma.room.upsert({
        where: { id: 'room-2' },
        update: {},
        create: {
            id: 'room-2',
            clinicId: clinic.id,
            name: 'Room 2',
            description: 'Secondary treatment room',
            color: '#10B981',
        },
    });
    console.log(`✅ Created ${2} rooms`);
    // Create procedures
    const procedures = [
        { code: 'EVAL', name: 'Evaluation', duration: 30, price: 150 },
        { code: 'CLEAN', name: 'Dental Cleaning', duration: 45, price: 200 },
        { code: 'FILL', name: 'Filling', duration: 60, price: 250 },
        { code: 'XRAY', name: 'X-Ray', duration: 15, price: 80 },
        { code: 'EXTRAC', name: 'Extraction', duration: 45, price: 300 },
        { code: 'ROOT', name: 'Root Canal', duration: 90, price: 800 },
        { code: 'CROWN', name: 'Crown', duration: 60, price: 1200 },
        { code: 'WHITEN', name: 'Teeth Whitening', duration: 90, price: 500 },
    ];
    for (const proc of procedures) {
        await prisma.procedure.upsert({
            where: { clinicId_code: { clinicId: clinic.id, code: proc.code } },
            update: {},
            create: {
                clinicId: clinic.id,
                code: proc.code,
                name: proc.name,
                duration: proc.duration,
                price: proc.price,
                category: 'General',
            },
        });
    }
    console.log(`✅ Created ${procedures.length} procedures`);
    // Create sample patients
    const patients = [
        { name: 'Maria da Silva', phone: '11987654321', email: 'maria@email.com', cpf: '12345678901' },
        { name: 'João Santos', phone: '11976543210', email: 'joao@email.com', cpf: '23456789012' },
        { name: 'Ana Costa', phone: '11965432109', email: 'ana@email.com', cpf: '34567890123' },
        { name: 'Pedro Oliveira', phone: '11954321098', email: 'pedro@email.com' },
        { name: 'Lucia Ferreira', phone: '11943210987', email: 'lucia@email.com' },
    ];
    for (const pat of patients) {
        const patient = await prisma.patient.upsert({
            where: pat.cpf
                ? { clinicId_cpf: { clinicId: clinic.id, cpf: pat.cpf } }
                : { id: `patient-${pat.phone}` },
            update: {},
            create: {
                id: pat.cpf ? undefined : `patient-${pat.phone}`,
                clinicId: clinic.id,
                name: pat.name,
                phone: pat.phone,
                email: pat.email,
                cpf: pat.cpf,
                tags: ['Demo'],
            },
        });
        // Create odontogram for each patient
        await prisma.odontogram.upsert({
            where: { patientId: patient.id },
            update: {},
            create: {
                clinicId: clinic.id,
                patientId: patient.id,
                type: 'ADULT',
                teeth: {},
            },
        });
    }
    console.log(`✅ Created ${patients.length} sample patients`);
    // Create reminder settings
    await prisma.reminderSettings.upsert({
        where: { clinicId: clinic.id },
        update: {},
        create: {
            clinicId: clinic.id,
            appointmentReminders: {
                enabled: true,
                intervals: [24, 2],
                channels: ['WHATSAPP_TEXT'],
            },
            birthdayMessages: {
                enabled: true,
                daysBefore: 0,
            },
            returnReminders: {
                enabled: true,
                defaultIntervalDays: 180,
            },
            sendingHours: {
                start: '08:00',
                end: '20:00',
                days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
            },
            fallbackOrder: ['WHATSAPP_TEXT', 'SMS', 'EMAIL'],
        },
    });
    console.log(`✅ Created reminder settings`);
    console.log('\n🎉 Database seed completed successfully!\n');
    console.log('Demo credentials:');
    console.log('  Admin:        admin@demo.dpm.local / Admin@123');
    console.log('  Dentist:      dentist@demo.dpm.local / Dentist@123');
    console.log('  Receptionist: reception@demo.dpm.local / Reception@123');
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map