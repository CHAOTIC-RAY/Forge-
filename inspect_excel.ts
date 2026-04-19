import XLSX from 'xlsx';
import path from 'path';

const filePath = 'c:/Users/advertise/Documents/GitHub/Forge-/app/applet/Content_Calendarv2.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  console.log('Sheet Names:', sheetNames);

  sheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    console.log(`\n--- Sheet: ${name} ---`);
    
    // Get column headers (assuming first row)
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (data.length > 0) {
      console.log('Headers:', data[0]);
      console.log('Sample Row:', data[1]);
    }

    // Try to get some info about styles if possible (xlsx doesn't support styles well, but let's see)
    // Actually exceljs is better for styles, but xlsx is simpler for reading data.
  });

} catch (err) {
  console.error('Error reading excel file:', err);
}
