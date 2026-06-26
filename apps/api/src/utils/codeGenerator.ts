export function generateImprovementCode(divisionCode: string): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `BA-${year}-${divisionCode.toUpperCase()}-${random}`;
}

export function generatePeriodName(type: string, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const quarter = Math.ceil(month / 3);

  switch (type) {
    case 'MONTHLY': {
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${monthNames[month - 1]} ${year}`;
    }
    case 'QUARTERLY':
      return `Q${quarter} ${year}`;
    case 'SEMESTER':
      return `Semester ${month <= 6 ? 1 : 2} ${year}`;
    case 'ANNUAL':
      return `Tahun ${year}`;
    default:
      return `Periode ${year}`;
  }
}
