/**
 * Fees and Payments Seed
 * Creates fee structures and payment records
 */

async function seed(prisma) {
  console.log('  💰 Creating fees and payments...');

  const { branches, users } = global.uatData;
  const { activeYear } = global.uatData.academic;

  // Cache cashier for each branch
  const processedByCashier = {};
  for (const branch of branches) {
    processedByCashier[branch.id] = users.cashiers.find(c => c.userScope?.branchId === branch.id)?.id;
  }

  // Create fee structures
  for (const branch of branches) {
    await prisma.feeStructure.create({
      data: {
        name: `${branch.name} Fee Structure`,
        branchId: branch.id,
        academicYearId: activeYear.id,
        tuitionFee: 5000,
        registrationFee: 500,
        libraryFee: 200,
        labFee: 300,
        sportsFee: 150,
        otherFees: 100,
      }
    });
  }

  const feesData = [];
  const months = ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June'];

  for (const branch of branches) {
    const branchStudents = users.students.filter(s => s.studentProfile?.branchId === branch.id);
    
    for (const student of branchStudents) {
      if (student.studentProfile) {
        for (const month of months) {
          const yearPart = activeYear.year.split('/')[0] || activeYear.year.split('-')[0];
          const dueDate = new Date(parseInt(yearPart), months.indexOf(month) + 8, 15);
          
          feesData.push({
            studentId: student.studentProfile.id,
            amount: 6250, // Total monthly fee
            description: `${month} Tuition Fee`,
            month,
            dueDate,
            academicYearId: activeYear.id,
            paid: Math.random() > 0.3, // 70% paid
          });
        }
      }
    }
  }

  if (feesData.length > 0) {
    await prisma.fee.createMany({
      data: feesData
    });
  }

  // Fetch created fees to link payments
  const createdFees = await prisma.fee.findMany({
    where: { academicYearId: activeYear.id }
  });

  const paymentsData = [];
  let paymentIndex = 0;
  for (const fee of createdFees) {
    if (fee.paid) {
      paymentIndex++;
      // Find branch of student to get cashier
      const student = users.students.find(s => s.studentProfile?.id === fee.studentId);
      const branchId = student?.studentProfile?.branchId;
      const cashierId = branchId ? processedByCashier[branchId] : null;

      paymentsData.push({
        feeId: fee.id,
        amount: fee.amount,
        paymentDate: new Date(fee.dueDate.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000),
        status: 'Completed',
        transactionReference: `TXN-${Date.now()}-${paymentIndex}-${Math.floor(Math.random() * 10000)}`,
        bankName: 'Test Bank',
        verifiedById: cashierId,
      });
    }
  }

  if (paymentsData.length > 0) {
    await prisma.payment.createMany({
      data: paymentsData
    });
  }

  console.log(`  ✅ Created ${createdFees.length} fees, ${paymentsData.length} payments`);
  
  global.uatData.fees = { fees: createdFees, payments: paymentsData };
}

module.exports = { name: '11_fees_payments', seed };
