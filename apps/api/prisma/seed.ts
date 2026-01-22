import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Helper functions for generating realistic data
const firstNames = [
  'Ana', 'Maria', 'José', 'João', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Marcos', 'Rafael',
  'Fernando', 'Ricardo', 'Bruno', 'Gabriel', 'Gustavo', 'Daniel', 'Felipe', 'Eduardo', 'André', 'Rodrigo',
  'Fernanda', 'Patricia', 'Camila', 'Amanda', 'Juliana', 'Aline', 'Larissa', 'Beatriz', 'Carolina', 'Mariana',
  'Renata', 'Cristina', 'Sandra', 'Silvia', 'Lucia', 'Regina', 'Teresa', 'Vera', 'Helena', 'Clara',
  'Isabella', 'Sofia', 'Valentina', 'Alice', 'Laura', 'Manuela', 'Julia', 'Heloísa', 'Luiza', 'Lorena',
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento',
  'Carvalho', 'Araújo', 'Ribeiro', 'Gomes', 'Martins', 'Rocha', 'Barbosa', 'Pereira', 'Moreira', 'Alves',
  'Monteiro', 'Mendes', 'Cardoso', 'Freitas', 'Ramos', 'Teixeira', 'Vieira', 'Castro', 'Lopes', 'Dias',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCPF(): string {
  return Array.from({ length: 11 }, () => randomInt(0, 9)).join('');
}

function generatePhone(): string {
  return `11${randomInt(91000, 99999)}${randomInt(1000, 9999)}`;
}

function generateEmail(name: string): string {
  const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'email.com'];
  const cleanName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
  return `${cleanName}${randomInt(1, 999)}@${randomItem(domains)}`;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Create subscription plans
  const subscriptionPlans = [
    {
      name: 'Free',
      tier: 'FREE',
      price: 0,
      billingPeriod: 'monthly',
      maxUsers: 1,
      maxPatients: 50,
      maxAppointments: 100,
      maxStorage: 1,
      features: ['Agenda básica', 'Cadastro de pacientes', 'Prontuário simples'],
    },
    {
      name: 'Starter',
      tier: 'STARTER',
      price: 99,
      billingPeriod: 'monthly',
      maxUsers: 3,
      maxPatients: 300,
      maxAppointments: 500,
      maxStorage: 5,
      features: ['Tudo do Free', 'Lembretes WhatsApp', 'Financeiro básico', 'Documentos'],
    },
    {
      name: 'Professional',
      tier: 'PROFESSIONAL',
      price: 199,
      billingPeriod: 'monthly',
      maxUsers: 10,
      maxPatients: 1000,
      maxAppointments: -1, // unlimited
      maxStorage: 20,
      features: ['Tudo do Starter', 'Relatórios avançados', 'Múltiplas salas', 'Suporte prioritário'],
    },
    {
      name: 'Enterprise',
      tier: 'ENTERPRISE',
      price: 499,
      billingPeriod: 'monthly',
      maxUsers: -1, // unlimited
      maxPatients: -1, // unlimited
      maxAppointments: -1, // unlimited
      maxStorage: 100,
      features: ['Tudo do Professional', 'Usuários ilimitados', 'API de integração', 'Suporte dedicado'],
    },
  ];

  let defaultPlan;
  for (const plan of subscriptionPlans) {
    const created = await prisma.subscriptionPlan.upsert({
      where: { id: plan.tier.toLowerCase() },
      update: {},
      create: {
        id: plan.tier.toLowerCase(),
        name: plan.name,
        tier: plan.tier as any,
        price: plan.price,
        billingPeriod: plan.billingPeriod,
        maxUsers: plan.maxUsers,
        maxPatients: plan.maxPatients,
        maxAppointments: plan.maxAppointments,
        maxStorage: plan.maxStorage,
        features: plan.features,
        isActive: true,
      },
    });
    if (plan.tier === 'STARTER') {
      defaultPlan = created;
    }
  }

  console.log(`✅ Created ${subscriptionPlans.length} subscription plans`);

  // Create super admin
  const superAdminPassword = await bcrypt.hash('SuperAdmin@123', 12);
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'admin@dpm.app' },
    update: {},
    create: {
      email: 'admin@dpm.app',
      passwordHash: superAdminPassword,
      name: 'Super Admin',
      isActive: true,
    },
  });

  console.log(`✅ Created super admin: ${superAdmin.email}`);

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

  // Create subscription for demo clinic
  if (defaultPlan) {
    await prisma.subscription.upsert({
      where: { clinicId: clinic.id },
      update: {},
      create: {
        clinicId: clinic.id,
        planId: defaultPlan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
    console.log(`✅ Created subscription for demo clinic (${defaultPlan.name} plan)`);
  }

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

  // Create second professional
  const dentist2User = await prisma.user.upsert({
    where: { clinicId_email: { clinicId: clinic.id, email: 'dentist2@demo.dpm.local' } },
    update: {},
    create: {
      clinicId: clinic.id,
      email: 'dentist2@demo.dpm.local',
      passwordHash: dentistPassword,
      name: 'Dra. Maria Santos',
      role: 'DENTIST',
    },
  });

  const professional2 = await prisma.professional.upsert({
    where: { userId: dentist2User.id },
    update: {},
    create: {
      clinicId: clinic.id,
      userId: dentist2User.id,
      name: 'Dra. Maria Santos',
      cro: '54321',
      croState: 'SP',
      specialty: 'Orthodontics',
      color: '#10B981',
      workingHours: {
        monday: { enabled: true, start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
        tuesday: { enabled: true, start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
        wednesday: { enabled: true, start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
        thursday: { enabled: true, start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
        friday: { enabled: true, start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
        saturday: { enabled: false },
        sunday: { enabled: false },
      },
      commissionType: 'PERCENTAGE',
      commissionValue: 45,
    },
  });

  console.log(`✅ Created second dentist: ${dentist2User.email}`);

  // Generate 100 patients with realistic data
  const patientTags = ['VIP', 'Convênio', 'Particular', 'Retorno', 'Novo', 'Ortodontia', 'Implante'];
  const patientSources = ['indication', 'google', 'instagram', 'facebook', 'website', 'walk-in', 'unknown'];
  const createdPatients: { id: string; name: string }[] = [];

  console.log('Creating 100 patients...');

  for (let i = 0; i < 100; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const name = `${firstName} ${lastName}`;
    const cpf = generateCPF();
    const phone = generatePhone();
    const birthDate = randomDate(new Date(1950, 0, 1), new Date(2010, 11, 31));

    try {
      const patient = await prisma.patient.create({
        data: {
          clinicId: clinic.id,
          name,
          phone,
          email: generateEmail(name),
          cpf,
          birthDate,
          gender: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
          maritalStatus: randomItem(['single', 'married', 'divorced', 'widowed']),
          occupation: randomItem(['Engenheiro', 'Professor', 'Médico', 'Advogado', 'Empresário', 'Estudante', 'Aposentado', 'Autônomo']),
          source: randomItem(patientSources),
          tags: [randomItem(patientTags), randomItem(patientTags)].filter((v, i, a) => a.indexOf(v) === i),
          address: Math.random() > 0.3 ? {
            street: `Rua ${randomItem(lastNames)}`,
            number: String(randomInt(1, 2000)),
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: `0${randomInt(1000, 9999)}000`,
          } : undefined,
          // Anamnesis (medical history)
          anamnesis: Math.random() > 0.3 ? {
            allergies: Math.random() > 0.7 ? [randomItem(['Penicilina', 'Dipirona', 'Látex', 'Anestésicos locais'])] : [],
            medications: Math.random() > 0.6 ? [randomItem(['Losartana', 'Metformina', 'Omeprazol', 'AAS', 'Sinvastatina'])] : [],
            conditions: Math.random() > 0.5 ? [randomItem(['Hipertensão', 'Diabetes', 'Cardiopatia', 'Asma'])] : [],
            surgeries: Math.random() > 0.8 ? [randomItem(['Apendicectomia', 'Cesariana', 'Colecistectomia'])] : [],
            pregnant: false,
            breastfeeding: false,
            smoker: Math.random() > 0.8,
            alcoholUse: Math.random() > 0.7 ? randomItem(['none', 'social', 'regular']) : 'none',
            bloodType: randomItem(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null]),
            lastDentalVisit: randomItem(['less_than_6_months', '6_to_12_months', 'more_than_1_year', 'more_than_2_years']),
            brushingFrequency: randomItem(['once', 'twice', 'three_times']),
            usesFloss: Math.random() > 0.5,
            usesMouthwash: Math.random() > 0.6,
            mainComplaint: Math.random() > 0.5 ? randomItem(['Dor de dente', 'Limpeza', 'Check-up', 'Clareamento', 'Dente quebrado']) : null,
            observations: Math.random() > 0.8 ? 'Paciente ansioso, requer atenção especial' : null,
          } : null,
        },
      });

      // Create odontogram for each patient
      await prisma.odontogram.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          type: birthDate.getFullYear() > 2010 ? 'CHILD' : 'ADULT',
          teeth: {},
        },
      });

      createdPatients.push({ id: patient.id, name: patient.name });
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log(`✅ Created ${createdPatients.length} patients`);

  // Get procedures for appointments
  const allProcedures = await prisma.procedure.findMany({
    where: { clinicId: clinic.id },
  });

  const professionals = [professional, professional2];
  const rooms = [room1, room2];
  const appointmentStatuses = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;
  const paymentMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BANK_TRANSFER'] as const;

  // Generate appointments for past 6 months and next 2 weeks
  const today = new Date();
  const sixMonthsAgo = addDays(today, -180);
  const twoWeeksFromNow = addDays(today, 14);

  console.log('Creating appointments and payments...');
  let appointmentCount = 0;
  let paymentCount = 0;

  // Generate past appointments (completed, no-show, cancelled)
  for (let d = 0; d < 180; d++) {
    const date = addDays(sixMonthsAgo, d);
    const dayOfWeek = date.getDay();

    // Skip Sundays
    if (dayOfWeek === 0) continue;

    // Less appointments on Saturdays
    const appointmentsPerDay = dayOfWeek === 6 ? randomInt(3, 8) : randomInt(8, 15);

    for (let a = 0; a < appointmentsPerDay; a++) {
      const patient = randomItem(createdPatients);
      const prof = randomItem(professionals);
      const room = randomItem(rooms);
      const procedure = randomItem(allProcedures);

      // Random time between 8:00 and 17:00
      const hour = randomInt(8, 17);
      const minute = randomItem([0, 30]);
      const startTime = setTime(date, hour, minute);
      const endTime = new Date(startTime.getTime() + procedure.duration * 60000);

      // Past appointments are mostly completed
      const rand = Math.random();
      let status: typeof appointmentStatuses[number];
      if (rand < 0.75) status = 'COMPLETED';
      else if (rand < 0.85) status = 'NO_SHOW';
      else if (rand < 0.95) status = 'CANCELLED';
      else status = 'CONFIRMED';

      try {
        const appointment = await prisma.appointment.create({
          data: {
            clinicId: clinic.id,
            patientId: patient.id,
            professionalId: prof.id,
            roomId: room.id,
            procedureId: procedure.id,
            type: randomItem(['EVALUATION', 'TREATMENT', 'RETURN', 'MAINTENANCE'] as const),
            status,
            startTime,
            endTime,
            createdBy: adminUser.id,
            notes: status === 'COMPLETED' ? 'Procedimento realizado com sucesso.' : undefined,
          },
        });
        appointmentCount++;

        // Create payment for completed appointments
        if (status === 'COMPLETED' && Math.random() > 0.1) {
          const paymentMethod = randomItem(paymentMethods);
          const isPaid = Math.random() > 0.15;

          await prisma.payment.create({
            data: {
              clinicId: clinic.id,
              patientId: patient.id,
              appointmentId: appointment.id,
              amount: procedure.price,
              paidAmount: isPaid ? procedure.price : 0,
              method: paymentMethod,
              status: isPaid ? 'PAID' : (Math.random() > 0.5 ? 'PENDING' : 'OVERDUE'),
              paidAt: isPaid ? endTime : undefined,
              dueDate: addDays(endTime, 7),
              description: `Pagamento - ${procedure.name}`,
              createdBy: adminUser.id,
            },
          });
          paymentCount++;
        }
      } catch (e: any) {
        // Log error for debugging
        if (appointmentCount < 3) {
          console.log('Appointment creation error:', e.message);
        }
      }
    }
  }

  // Generate future appointments (scheduled, confirmed)
  for (let d = 1; d <= 14; d++) {
    const date = addDays(today, d);
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0) continue;

    const appointmentsPerDay = dayOfWeek === 6 ? randomInt(3, 6) : randomInt(5, 12);

    for (let a = 0; a < appointmentsPerDay; a++) {
      const patient = randomItem(createdPatients);
      const prof = randomItem(professionals);
      const room = randomItem(rooms);
      const procedure = randomItem(allProcedures);

      const hour = randomInt(8, 17);
      const minute = randomItem([0, 30]);
      const startTime = setTime(date, hour, minute);
      const endTime = new Date(startTime.getTime() + procedure.duration * 60000);

      const status = Math.random() > 0.4 ? 'CONFIRMED' : 'SCHEDULED';

      try {
        await prisma.appointment.create({
          data: {
            clinicId: clinic.id,
            patientId: patient.id,
            professionalId: prof.id,
            roomId: room.id,
            procedureId: procedure.id,
            type: randomItem(['EVALUATION', 'TREATMENT', 'RETURN', 'MAINTENANCE'] as const),
            status,
            startTime,
            endTime,
            createdBy: adminUser.id,
          },
        });
        appointmentCount++;
      } catch (e) {
        // Skip conflicts
      }
    }
  }

  console.log(`✅ Created ${appointmentCount} appointments`);
  console.log(`✅ Created ${paymentCount} payments`);

  // Create financial transactions (expenses and income)
  const expenseCategories = ['Supplies', 'Utilities', 'Rent', 'Marketing', 'Equipment', 'Salaries'];
  const expenseDescriptions: Record<string, string[]> = {
    'Supplies': ['Material odontológico', 'Luvas descartáveis', 'Máscaras', 'Resina composta', 'Anestésicos'],
    'Utilities': ['Conta de luz', 'Conta de água', 'Internet', 'Telefone'],
    'Rent': ['Aluguel mensal', 'Condomínio'],
    'Marketing': ['Google Ads', 'Instagram Ads', 'Impressão de panfletos', 'Cartões de visita'],
    'Equipment': ['Manutenção de equipamentos', 'Autoclave', 'Compressor'],
    'Salaries': ['Folha de pagamento', 'Adiantamento salarial'],
  };

  let transactionCount = 0;

  // Create transactions for CURRENT month (important for dashboard)
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Current month income from payments
  for (let i = 0; i < 50; i++) {
    await prisma.transaction.create({
      data: {
        clinicId: clinic.id,
        type: 'INCOME',
        category: 'Services',
        description: `Pagamento de ${randomItem(['consulta', 'tratamento', 'limpeza', 'avaliação'])}`,
        amount: randomInt(150, 1500),
        date: randomDate(currentMonthStart, today),
        method: randomItem(paymentMethods),
        createdBy: adminUser.id,
      },
    });
    transactionCount++;
  }

  // Current month expenses
  await prisma.transaction.create({
    data: {
      clinicId: clinic.id,
      type: 'EXPENSE',
      category: 'Rent',
      description: 'Aluguel mensal',
      amount: 5000,
      date: currentMonthStart,
      createdBy: adminUser.id,
    },
  });
  transactionCount++;

  for (let i = 0; i < 15; i++) {
    const category = randomItem(expenseCategories);
    const descriptions = expenseDescriptions[category] || ['Despesa geral'];
    await prisma.transaction.create({
      data: {
        clinicId: clinic.id,
        type: 'EXPENSE',
        category,
        description: randomItem(descriptions),
        amount: randomInt(50, 800),
        date: randomDate(currentMonthStart, today),
        createdBy: adminUser.id,
      },
    });
    transactionCount++;
  }

  // Past months transactions
  for (let m = 1; m <= 6; m++) {
    const monthDate = addDays(today, -30 * m);

    // Fixed monthly expenses
    await prisma.transaction.create({
      data: {
        clinicId: clinic.id,
        type: 'EXPENSE',
        category: 'Rent',
        description: 'Aluguel mensal',
        amount: 5000,
        date: monthDate,
        createdBy: adminUser.id,
      },
    });
    transactionCount++;

    await prisma.transaction.create({
      data: {
        clinicId: clinic.id,
        type: 'EXPENSE',
        category: 'Utilities',
        description: 'Conta de luz',
        amount: randomInt(400, 800),
        date: monthDate,
        createdBy: adminUser.id,
      },
    });
    transactionCount++;

    // Random expenses
    const numExpenses = randomInt(5, 10);
    for (let e = 0; e < numExpenses; e++) {
      const category = randomItem(expenseCategories);
      const descriptions = expenseDescriptions[category] || ['Despesa geral'];

      await prisma.transaction.create({
        data: {
          clinicId: clinic.id,
          type: 'EXPENSE',
          category,
          description: randomItem(descriptions),
          amount: randomInt(50, 2000),
          date: randomDate(addDays(monthDate, -15), addDays(monthDate, 15)),
          createdBy: adminUser.id,
        },
      });
      transactionCount++;
    }

    // Add some income transactions
    const numIncome = randomInt(3, 6);
    for (let i = 0; i < numIncome; i++) {
      await prisma.transaction.create({
        data: {
          clinicId: clinic.id,
          type: 'INCOME',
          category: 'Services',
          description: 'Pagamento de consulta',
          amount: randomInt(100, 1500),
          date: randomDate(addDays(monthDate, -15), addDays(monthDate, 15)),
          method: randomItem(paymentMethods),
          createdBy: adminUser.id,
        },
      });
      transactionCount++;
    }
  }

  console.log(`✅ Created ${transactionCount} transactions`);

  // Create clinical notes for some patients
  let clinicalNoteCount = 0;
  const noteContents = [
    'Paciente apresentou-se para consulta de rotina. Higiene oral satisfatória. Não foram identificadas cáries ou outras alterações.',
    'Realizada limpeza e profilaxia dental. Orientação sobre técnica de escovação e uso de fio dental.',
    'Paciente queixa-se de sensibilidade nos dentes posteriores. Recomendado uso de creme dental para sensibilidade.',
    'Avaliação clínica sem alterações. Radiografia panorâmica solicitada para acompanhamento.',
    'Paciente retornou para continuidade do tratamento. Evolução satisfatória.',
    'Procedimento realizado sem intercorrências. Orientações pós-operatórias fornecidas.',
    'Paciente relatou melhora dos sintomas. Tratamento mantido conforme planejado.',
    'Exame clínico revelou necessidade de restauração no elemento 36. Orçamento apresentado.',
  ];

  for (let i = 0; i < 50; i++) {
    const patient = randomItem(createdPatients);
    const prof = randomItem(professionals);
    const noteDate = randomDate(addDays(today, -90), today);

    try {
      await prisma.clinicalNote.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          professionalId: prof.id,
          content: randomItem(noteContents),
          isFinal: Math.random() > 0.3,
          finalizedAt: Math.random() > 0.3 ? noteDate : undefined,
          createdAt: noteDate,
        },
      });
      clinicalNoteCount++;
    } catch (e) {
      // Skip errors
    }
  }

  console.log(`✅ Created ${clinicalNoteCount} clinical notes`);

  // Create treatment plans for some patients
  let treatmentPlanCount = 0;
  const planStatuses = ['DRAFT', 'PRESENTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'] as const;

  for (let i = 0; i < 30; i++) {
    const patient = randomItem(createdPatients);
    const prof = randomItem(professionals);
    const status = randomItem(planStatuses);
    const procedures = allProcedures.slice(0, randomInt(2, 5));
    const totalCost = procedures.reduce((sum, p) => sum + Number(p.price), 0);

    try {
      const plan = await prisma.treatmentPlan.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          professionalId: prof.id,
          name: `Plano de tratamento - ${patient.name.split(' ')[0]}`,
          description: 'Plano de tratamento odontológico completo',
          totalCost,
          status,
          presentedAt: status !== 'DRAFT' ? randomDate(addDays(today, -60), today) : undefined,
          approvedAt: ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(status) ? randomDate(addDays(today, -30), today) : undefined,
          validUntil: addDays(today, 90),
        },
      });

      // Add treatment plan items
      for (const proc of procedures) {
        await prisma.treatmentPlanItem.create({
          data: {
            planId: plan.id,
            procedureId: proc.id,
            tooth: Math.random() > 0.5 ? String(randomInt(11, 48)) : undefined,
            quantity: 1,
            unitPrice: proc.price,
            totalPrice: proc.price,
            priority: randomInt(1, 5),
            status: status === 'COMPLETED' ? 'COMPLETED' : status,
          },
        });
      }

      treatmentPlanCount++;
    } catch (e) {
      // Skip errors
    }
  }

  console.log(`✅ Created ${treatmentPlanCount} treatment plans`);

  // Create survey (satisfaction) data
  const survey = await prisma.survey.upsert({
    where: { id: 'default-nps-survey' },
    update: {},
    create: {
      id: 'default-nps-survey',
      clinicId: clinic.id,
      name: 'Pesquisa NPS',
      type: 'NPS',
      description: 'Pesquisa de satisfação do paciente',
      isActive: true,
      autoSend: true,
      triggerAfterDays: 1,
      thankYouMessage: 'Obrigado por responder nossa pesquisa!',
    },
  });

  // Create survey questions
  const npsQuestion = await prisma.surveyQuestion.upsert({
    where: { id: 'nps-question-1' },
    update: {},
    create: {
      id: 'nps-question-1',
      surveyId: survey.id,
      type: 'NPS',
      question: 'Em uma escala de 0 a 10, o quanto você recomendaria nossa clínica para amigos e familiares?',
      isRequired: true,
      order: 1,
    },
  });

  const textQuestion = await prisma.surveyQuestion.upsert({
    where: { id: 'nps-question-2' },
    update: {},
    create: {
      id: 'nps-question-2',
      surveyId: survey.id,
      type: 'OPEN_TEXT',
      question: 'O que motivou sua nota?',
      isRequired: false,
      order: 2,
    },
  });

  // Create survey responses
  let surveyResponseCount = 0;
  const npsComments = [
    'Excelente atendimento! Muito satisfeito.',
    'Profissionais muito atenciosos e competentes.',
    'Ambiente limpo e organizado. Recomendo!',
    'Ótimo tratamento, voltarei sempre.',
    'Atendimento bom, mas demorou um pouco.',
    'Preços justos e qualidade no atendimento.',
    'Equipe muito simpática e prestativa.',
    'Tratamento de canal excelente, sem dor!',
  ];

  for (let i = 0; i < 40; i++) {
    const patient = randomItem(createdPatients);
    const npsScore = randomInt(6, 10); // Most responses are positive
    const responseDate = randomDate(addDays(today, -90), today);
    const token = `survey-token-${Date.now()}-${i}-${randomInt(1000, 9999)}`;

    try {
      const response = await prisma.surveyResponse.create({
        data: {
          clinicId: clinic.id,
          surveyId: survey.id,
          patientId: patient.id,
          token,
          npsScore,
          completedAt: responseDate,
          expiresAt: addDays(responseDate, 30),
          createdAt: responseDate,
        },
      });

      // Create answers
      await prisma.surveyResponseAnswer.create({
        data: {
          responseId: response.id,
          questionId: npsQuestion.id,
          value: String(npsScore),
          numericValue: npsScore,
        },
      });

      if (Math.random() > 0.4) {
        await prisma.surveyResponseAnswer.create({
          data: {
            responseId: response.id,
            questionId: textQuestion.id,
            value: randomItem(npsComments),
          },
        });
      }

      surveyResponseCount++;
    } catch (e) {
      // Skip errors
    }
  }

  console.log(`✅ Created ${surveyResponseCount} survey responses`);

  // Create message logs (reminders sent)
  let messageLogCount = 0;
  const messageChannels = ['WHATSAPP_TEXT', 'SMS', 'EMAIL'] as const;
  const messageStatuses = ['SENT', 'DELIVERED', 'READ', 'FAILED'] as const;
  const messageContents = [
    'Olá! Lembrete: sua consulta está agendada para amanhã às 10:00. Confirme sua presença.',
    'Não se esqueça! Você tem uma consulta marcada para amanhã. Até lá!',
    'Confirmação de consulta: amanhã às 14:30. Responda SIM para confirmar.',
    'Feliz aniversário! 🎂 A equipe da clínica deseja um dia maravilhoso!',
    'Está na hora de sua revisão odontológica. Agende sua consulta!',
  ];

  for (let i = 0; i < 100; i++) {
    const patient = randomItem(createdPatients);
    const msgDate = randomDate(addDays(today, -30), today);
    const status = randomItem(messageStatuses);

    try {
      await prisma.messageLog.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          channel: randomItem(messageChannels),
          content: randomItem(messageContents),
          status,
          sentAt: status !== 'QUEUED' ? msgDate : undefined,
          deliveredAt: ['DELIVERED', 'READ'].includes(status) ? msgDate : undefined,
          readAt: status === 'READ' ? msgDate : undefined,
          errorMessage: status === 'FAILED' ? 'Número de telefone inválido' : undefined,
        },
      });
      messageLogCount++;
    } catch (e) {
      // Skip errors
    }
  }

  console.log(`✅ Created ${messageLogCount} message logs`);

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

  // Create document templates
  const prescriptionTemplate = await prisma.documentTemplate.upsert({
    where: { id: 'template-prescription-default' },
    update: {},
    create: {
      id: 'template-prescription-default',
      clinicId: clinic.id,
      type: 'PRESCRIPTION',
      name: 'Receituário Padrão',
      content: `
RECEITUÁRIO

Paciente: {{patientName}}
Data: {{currentDate}}

MEDICAMENTOS:
{{medications}}

_______________________________
{{professionalName}}
CRO: {{professionalCro}}
      `.trim(),
      isDefault: true,
    },
  });

  const certificateTemplate = await prisma.documentTemplate.upsert({
    where: { id: 'template-certificate-default' },
    update: {},
    create: {
      id: 'template-certificate-default',
      clinicId: clinic.id,
      type: 'CERTIFICATE',
      name: 'Atestado Odontológico',
      content: `
ATESTADO ODONTOLÓGICO

Atesto para os devidos fins que o(a) paciente {{patientName}}, portador(a) do CPF {{patientCpf}}, esteve sob meus cuidados profissionais na data de {{currentDate}}, necessitando de afastamento de suas atividades por _____ dia(s).

CID: _____________

{{customContent}}

_______________________________
{{professionalName}}
CRO: {{professionalCro}}
      `.trim(),
      isDefault: true,
    },
  });

  const referralTemplate = await prisma.documentTemplate.upsert({
    where: { id: 'template-referral-default' },
    update: {},
    create: {
      id: 'template-referral-default',
      clinicId: clinic.id,
      type: 'REFERRAL',
      name: 'Encaminhamento',
      content: `
ENCAMINHAMENTO

Encaminho o(a) paciente {{patientName}} para avaliação/tratamento de:

{{customContent}}

Informações relevantes:
__________________________________________
__________________________________________

Data: {{currentDate}}

_______________________________
{{professionalName}}
CRO: {{professionalCro}}
      `.trim(),
      isDefault: true,
    },
  });

  const consentTemplate = await prisma.documentTemplate.upsert({
    where: { id: 'template-consent-default' },
    update: {},
    create: {
      id: 'template-consent-default',
      clinicId: clinic.id,
      type: 'CONSENT',
      name: 'Termo de Consentimento para Tratamento',
      content: `
TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO

Eu, {{patientName}}, portador(a) do CPF {{patientCpf}}, declaro que fui devidamente informado(a) pelo(a) Dr(a). {{professionalName}} sobre:

1. O diagnóstico e a natureza do tratamento proposto;
2. Os benefícios esperados e os riscos possíveis;
3. As alternativas de tratamento disponíveis;
4. As consequências da não realização do tratamento.

{{customContent}}

Após receber todas as informações necessárias, autorizo a realização do tratamento proposto.

Data: {{currentDate}}

_______________________________
Assinatura do Paciente

_______________________________
{{professionalName}}
CRO: {{professionalCro}}
      `.trim(),
      isDefault: true,
    },
  });

  console.log(`✅ Created ${4} document templates`);

  // Create help articles
  const helpArticles = [
    // Getting Started
    {
      slug: 'bem-vindo-ao-dpm',
      title: 'Bem-vindo ao DPM',
      category: 'GETTING_STARTED',
      order: 1,
      content: `# Bem-vindo ao DPM

O DPM (Dental Practice Management) é o sistema completo para gestão da sua clínica odontológica.

## Primeiros Passos

1. **Configure sua clínica** - Acesse Configurações para personalizar os dados da sua clínica
2. **Cadastre profissionais** - Adicione os dentistas e funcionários da equipe
3. **Configure a agenda** - Defina os horários de funcionamento e salas de atendimento
4. **Cadastre pacientes** - Comece a cadastrar seus pacientes

## Recursos Principais

- 📅 **Agenda** - Gerencie consultas e compromissos
- 👥 **Pacientes** - Prontuário eletrônico completo
- 💰 **Financeiro** - Controle de receitas e despesas
- 📊 **Relatórios** - Análises e exportações

## Precisa de ajuda?

Navegue pelos artigos da central de ajuda ou abra um ticket de suporte.`,
    },
    {
      slug: 'configuracao-inicial',
      title: 'Configuração Inicial da Clínica',
      category: 'GETTING_STARTED',
      order: 2,
      content: `# Configuração Inicial da Clínica

Siga estes passos para configurar sua clínica no DPM.

## 1. Dados da Clínica

Acesse **Configurações > Clínica** e preencha:
- Nome fantasia e razão social
- CNPJ
- Endereço completo
- Telefone e e-mail de contato

## 2. Horário de Funcionamento

Configure os dias e horários de atendimento em **Configurações > Horários**.

## 3. Salas de Atendimento

Cadastre as salas/consultórios em **Configurações > Salas**.

## 4. Procedimentos

Configure a tabela de procedimentos em **Configurações > Procedimentos** com:
- Código do procedimento
- Nome e descrição
- Duração padrão
- Valor`,
    },
    // Patients
    {
      slug: 'cadastro-de-pacientes',
      title: 'Como Cadastrar Pacientes',
      category: 'PATIENTS',
      order: 1,
      content: `# Como Cadastrar Pacientes

O cadastro de pacientes é fundamental para o funcionamento do sistema.

## Cadastro Rápido

1. Acesse **Pacientes** no menu lateral
2. Clique em **Novo Paciente**
3. Preencha os dados básicos:
   - Nome completo
   - Telefone (obrigatório)
   - CPF
   - E-mail

## Dados Complementares

Após o cadastro inicial, você pode adicionar:
- Endereço completo
- Data de nascimento
- Convênio/Plano
- Responsável (menores de idade)
- Anamnese completa

## Dicas

- O telefone é usado para envio de lembretes automáticos
- O CPF é necessário para emissão de documentos
- Use as **tags** para organizar e filtrar pacientes`,
    },
    {
      slug: 'prontuario-eletronico',
      title: 'Prontuário Eletrônico',
      category: 'PATIENTS',
      order: 2,
      content: `# Prontuário Eletrônico

O prontuário eletrônico centraliza todas as informações do paciente.

## Odontograma

O odontograma permite registrar a situação de cada dente:
- Clique no dente para selecionar
- Escolha a condição ou procedimento
- Adicione anotações se necessário

## Histórico de Consultas

Todas as consultas ficam registradas com:
- Data e hora
- Profissional responsável
- Procedimentos realizados
- Anotações clínicas

## Documentos

Gere e armazene documentos como:
- Receituários
- Atestados
- Termos de consentimento
- Encaminhamentos

## Anexos

Faça upload de arquivos como:
- Radiografias
- Fotos
- Exames`,
    },
    // Scheduling
    {
      slug: 'agenda-e-consultas',
      title: 'Gerenciando a Agenda',
      category: 'SCHEDULING',
      order: 1,
      content: `# Gerenciando a Agenda

A agenda é o coração da operação da clínica.

## Visualizações

- **Diária** - Ver todos os horários do dia
- **Semanal** - Visão geral da semana
- **Mensal** - Calendário do mês

## Agendando Consultas

1. Clique no horário desejado
2. Selecione ou cadastre o paciente
3. Escolha o profissional
4. Selecione os procedimentos
5. Confirme o agendamento

## Status da Consulta

- 🔵 **Agendada** - Consulta marcada
- 🟢 **Confirmada** - Paciente confirmou presença
- 🟡 **Em atendimento** - Paciente sendo atendido
- ✅ **Concluída** - Atendimento finalizado
- ❌ **Cancelada** - Consulta cancelada
- ⚫ **Falta** - Paciente não compareceu

## Lembretes Automáticos

O sistema envia lembretes automáticos por WhatsApp, SMS ou e-mail.`,
    },
    // Financial
    {
      slug: 'controle-financeiro',
      title: 'Controle Financeiro',
      category: 'FINANCIAL',
      order: 1,
      content: `# Controle Financeiro

Gerencie as finanças da clínica de forma simples.

## Lançamentos

### Receitas
- Pagamentos de consultas
- Venda de produtos
- Outras entradas

### Despesas
- Fornecedores
- Salários
- Aluguel
- Outras saídas

## Formas de Pagamento

- Dinheiro
- Cartão de Crédito/Débito
- PIX
- Boleto
- Convênio

## Relatórios

- **Fluxo de Caixa** - Entradas e saídas por período
- **DRE** - Demonstrativo de resultados
- **Contas a Receber** - Pagamentos pendentes
- **Comissões** - Valores devidos aos profissionais`,
    },
    {
      slug: 'comissoes-profissionais',
      title: 'Comissões de Profissionais',
      category: 'FINANCIAL',
      order: 2,
      content: `# Comissões de Profissionais

Configure e acompanhe as comissões dos profissionais.

## Tipos de Comissão

### Percentual
O profissional recebe uma porcentagem do valor do procedimento.
Exemplo: 50% de uma consulta de R$ 200,00 = R$ 100,00

### Valor Fixo
Valor fixo por procedimento realizado.
Exemplo: R$ 80,00 por limpeza

### Misto
Combinação de percentual com valor mínimo ou máximo.

## Configuração

1. Acesse **Configurações > Profissionais**
2. Selecione o profissional
3. Configure o tipo e valor da comissão
4. Salve as alterações

## Relatório de Comissões

Acesse **Financeiro > Comissões** para visualizar e exportar.`,
    },
    // Clinical
    {
      slug: 'documentos-clinicos',
      title: 'Documentos Clínicos',
      category: 'CLINICAL',
      order: 1,
      content: `# Documentos Clínicos

Gere documentos profissionais diretamente no sistema.

## Tipos de Documentos

### Receituário
- Prescrição de medicamentos
- Posologia detalhada
- Orientações ao paciente

### Atestado
- Atestado de comparecimento
- Atestado para afastamento
- CID quando necessário

### Termo de Consentimento
- Explicação do procedimento
- Riscos e benefícios
- Assinatura do paciente

### Encaminhamento
- Referência para especialistas
- Informações clínicas relevantes

## Modelos Personalizados

Acesse **Configurações > Modelos** para criar seus próprios modelos de documentos.`,
    },
    // Settings
    {
      slug: 'configuracoes-sistema',
      title: 'Configurações do Sistema',
      category: 'SETTINGS',
      order: 1,
      content: `# Configurações do Sistema

Personalize o DPM para sua clínica.

## Dados da Clínica
- Informações cadastrais
- Logo e identidade visual
- Dados para documentos

## Usuários e Permissões

### Níveis de Acesso
- **Admin** - Acesso total
- **Dentista** - Agenda e prontuários
- **Recepcionista** - Agenda e cadastros
- **Financeiro** - Módulo financeiro

## Integrações

- WhatsApp Business API
- Gateway de pagamento
- Armazenamento de arquivos

## Lembretes Automáticos

Configure os lembretes em **Configurações > Lembretes**:
- Antecedência do envio
- Canais (WhatsApp, SMS, E-mail)
- Horários permitidos`,
    },
    // FAQ
    {
      slug: 'perguntas-frequentes',
      title: 'Perguntas Frequentes',
      category: 'FAQ',
      order: 1,
      content: `# Perguntas Frequentes

## Acesso e Login

**Como recuperar minha senha?**
Clique em "Esqueci minha senha" na tela de login e siga as instruções.

**Posso acessar de qualquer dispositivo?**
Sim, o DPM funciona em qualquer navegador moderno.

## Agenda

**Como cancelar uma consulta?**
Abra a consulta e clique em "Cancelar". Você pode informar o motivo.

**Os lembretes são automáticos?**
Sim, desde que configurados em Configurações > Lembretes.

## Financeiro

**Como registrar um pagamento parcelado?**
Ao registrar o pagamento, selecione "Parcelado" e informe o número de parcelas.

## Suporte

**Como abrir um ticket de suporte?**
Acesse Ajuda > Suporte e clique em "Novo Ticket".

**Qual o tempo de resposta?**
Nossa equipe responde em até 24 horas úteis.`,
    },
  ];

  for (const article of helpArticles) {
    await prisma.helpArticle.upsert({
      where: { slug: article.slug },
      update: {},
      create: {
        slug: article.slug,
        title: article.title,
        content: article.content,
        category: article.category as any,
        order: article.order,
        isPublished: true,
      },
    });
  }

  console.log(`✅ Created ${helpArticles.length} help articles`);

  console.log('\n🎉 Database seed completed successfully!\n');
  console.log('Demo credentials:');
  console.log('  Admin:        admin@demo.dpm.local / Admin@123');
  console.log('  Dentist:      dentist@demo.dpm.local / Dentist@123');
  console.log('  Receptionist: reception@demo.dpm.local / Reception@123');
  console.log('\nSuper Admin:');
  console.log('  Email:        admin@dpm.app');
  console.log('  Password:     SuperAdmin@123');
  console.log('  URL:          /admin/login');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
