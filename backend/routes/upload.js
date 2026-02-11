const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const moment = require('moment');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or field name mismatch' });
  }

  const filePath = req.file.path;

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    let data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // 🔹 Validar y convertir placedDate a UTC ISO string
    data = data.map(row => {
      if (!row.placedDate) return row;

      let date;

      // Si es número (Excel serial date)
      if (typeof row.placedDate === 'number') {
        const d = XLSX.SSF.parse_date_code(row.placedDate);
        if (!d) throw new Error(`Invalid Excel serial date: ${row.placedDate}`);
        date = moment.utc({ year: d.y, month: d.m - 1, day: d.d });
      } 
      // Si es string
      else if (typeof row.placedDate === 'string') {
        // Intentar parsear con ISO 8601 estricto o formatos comunes
        date = moment.utc(row.placedDate, [moment.ISO_8601, 'MM/DD/YYYY', 'YYYY-MM-DD'], true);
      }

      if (!date || !date.isValid()) {
        throw new Error(`Invalid date: ${row.placedDate}`);
      }
      
      return row;
    });


    console.log(data)

    // Borrar archivo temporal
    fs.unlinkSync(filePath);

    res.json({
      message: 'File processed successfully',
      rows: data.length,
      data,
    });
  } catch (err) {
    console.error(err);
    fs.existsSync(filePath) && fs.unlinkSync(filePath); // borrar archivo si hubo error
    res.status(400).json({ error: err.message || 'Error processing the file' });
  }
});

module.exports = router;
