const express = require('express');
const db = require('../db');
const { auth, managerAccess } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');
const XLSX = require('xlsx');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post('/categories/list', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories WHERE enabled = 1 ORDER BY sort_order, id').all();
  res.json(categories);
});

router.post('/categories/all', auth, managerAccess, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
  res.json(categories);
});

router.post('/categories', auth, managerAccess, (req, res) => {
  const { name, name_en, sort_order = 0 } = req.body;
  if (!name) return res.status(400).json({ error: '分类名称必填' });
  const result = db.prepare('INSERT INTO categories (name, name_en, sort_order) VALUES (?, ?, ?)').run(name, name_en, sort_order);
  res.json({ id: result.lastInsertRowid });
});

router.post('/categories/update/:id', auth, managerAccess, (req, res) => {
  const { name, name_en, sort_order, enabled } = req.body;
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (name_en !== undefined) { fields.push('name_en = ?'); values.push(name_en); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
  if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled ? 1 : 0); }
  values.push(req.params.id);
  db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.post('/categories/delete/:id', auth, managerAccess, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/list', (req, res) => {
  const { category_id } = req.query;
  let sql = 'SELECT p.*, c.name as category_name, c.name_en as category_name_en FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.available = 1';
  const params = [];
  if (category_id) { sql += ' AND p.category_id = ?'; params.push(category_id); }
  sql += ' ORDER BY p.sort_order, p.id';
  const products = db.prepare(sql).all(...params);
  res.json(products);
});

router.post('/all', auth, managerAccess, (req, res) => {
  const products = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.sort_order, p.id').all();
  res.json(products);
});

router.post('/detail/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: '商品不存在' });
  res.json(product);
});

router.post('/', auth, managerAccess, (req, res) => {
  const { name, name_en, category_id, price, description, description_en, image, available = 1, is_recommend = 0, sort_order = 0 } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: '商品名称和价格必填' });
  const result = db.prepare(`INSERT INTO products (name, name_en, category_id, price, description, description_en, image, available, is_recommend, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    name, name_en, category_id, price, description, description_en, image, available ? 1 : 0, is_recommend ? 1 : 0, sort_order
  );
  res.json({ id: result.lastInsertRowid });
});

router.post('/update/:id', auth, managerAccess, (req, res) => {
  const allowed = ['name', 'name_en', 'category_id', 'price', 'description', 'description_en', 'image', 'available', 'is_recommend', 'sort_order'];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(['available', 'is_recommend'].includes(key) ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: '没有要更新的字段' });
  values.push(req.params.id);
  db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

router.post('/delete/:id', auth, managerAccess, (req, res) => {
  const product = db.prepare('SELECT name, name_en FROM products WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  auditLog(req, 'DELETE_PRODUCT', `删除商品: ${product?.name || product?.name_en || req.params.id}`, { productId: req.params.id });
  res.json({ success: true });
});

const EXPORT_HEADERS = ['一级大类', '菜品中文名', '菜品英文名', '价格', '是否上架', '图片URL', '描述', '英文描述'];

router.post('/export/template', auth, managerAccess, (req, res) => {
  const ws = XLSX.utils.aoa_to_sheet([
    EXPORT_HEADERS,
    ['招牌奶茶', '黑糖珍珠奶茶', 'Brown Sugar Boba Milk Tea', 5.99, '是', '', '香浓黑糖搭配Q弹珍珠', 'Rich brown sugar with chewy boba'],
    ['烧烤串', '烤羊肉串', 'Lamb Skewer', 3.99, '是', '', '新疆风味，鲜嫩多汁', 'Xinjiang style, tender and juicy']
  ]);
  ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 30 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '菜品导入模板');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="product_import_template.xlsx"');
  res.send(buf);
});

router.post('/export', auth, managerAccess, (req, res) => {
  const products = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY c.sort_order, p.sort_order, p.id').all();
  const rows = [EXPORT_HEADERS];
  products.forEach(p => {
    rows.push([p.category_name || '', p.name || '', p.name_en || '', p.price || 0, p.available ? '是' : '否', p.image || '', p.description || '', p.description_en || '']);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 30 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '菜品列表');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="products_export.xlsx"');
  res.send(buf);
});

router.post('/import', auth, managerAccess, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传Excel文件' });
    const confirmImport = req.body.confirm === 'true' || req.query.confirm === 'true';
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length < 2) return res.status(400).json({ error: '文件为空或格式错误' });
    const header = rows[0].map(h => String(h || '').trim());
    const catIdx = header.findIndex(h => h.includes('大类') || h.includes('分类'));
    const nameIdx = header.findIndex(h => h.includes('中文') || (h.includes('名') && !h.includes('英文')));
    const nameEnIdx = header.findIndex(h => h.includes('英文'));
    const priceIdx = header.findIndex(h => h.includes('价格'));
    const availIdx = header.findIndex(h => h.includes('上架') || h.includes('启用'));
    const imgIdx = header.findIndex(h => h.includes('图片') || h.toLowerCase().includes('image'));
    const descIdx = header.findIndex(h => h === '描述' || (h.includes('描述') && !h.includes('英文')));
    const descEnIdx = header.findIndex(h => h.includes('英文描述') || h.includes('描述英文'));
    if (nameIdx === -1 || priceIdx === -1) return res.status(400).json({ error: '必须包含"菜品中文名"和"价格"列' });
    const insertProduct = db.prepare(`INSERT INTO products (name, name_en, category_id, price, description, description_en, image, available, is_recommend, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`);
    const getCategory = db.prepare('SELECT id FROM categories WHERE name = ? OR name_en = ?');
    const createCategory = db.prepare('INSERT INTO categories (name, name_en, sort_order) VALUES (?, ?, ?)');
    const getMaxSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM products');
    const findDuplicate = db.prepare('SELECT id, name FROM products WHERE name = ? AND COALESCE(category_id, 0) = COALESCE(?, 0) LIMIT 1');
    const duplicates = [];
    const validRows = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = String(row[nameIdx] || '').trim();
      if (!name) continue;
      let categoryId = null;
      if (catIdx !== -1 && row[catIdx]) {
        const catName = String(row[catIdx]).trim();
        const cat = getCategory.get(catName, catName);
        categoryId = cat ? cat.id : null;
      }
      const dup = findDuplicate.get(name, categoryId);
      if (dup) { duplicates.push({ row: i + 1, name, category: categoryId ? String(row[catIdx]) : '未分类' }); }
      else { validRows.push(row); }
    }
    if (!confirmImport && duplicates.length > 0) {
      return res.json({ needConfirm: true, duplicates: duplicates.slice(0, 20), duplicateCount: duplicates.length, totalRows: rows.length - 1 });
    }
    let success = 0, failed = 0, skipped = 0;
    const errors = [];
    let currentSort = getMaxSort.get().max_sort;
    const tx = db.transaction(() => {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = String(row[nameIdx] || '').trim();
        const price = parseFloat(row[priceIdx]) || 0;
        if (!name) { failed++; errors.push(`第${i + 1}行：商品名称为空，跳过`); continue; }
        let categoryId = null;
        if (catIdx !== -1 && row[catIdx]) {
          const catName = String(row[catIdx]).trim();
          let cat = getCategory.get(catName, catName);
          if (!cat) { const r = createCategory.run(catName, '', 0); categoryId = r.lastInsertRowid; }
          else { categoryId = cat.id; }
        }
        const dup = findDuplicate.get(name, categoryId);
        if (dup) { skipped++; continue; }
        const nameEn = nameEnIdx !== -1 ? String(row[nameEnIdx] || '').trim() : '';
        const available = availIdx !== -1 ? (String(row[availIdx]).includes('否') || String(row[availIdx]).includes('0') ? 0 : 1) : 1;
        const image = imgIdx !== -1 ? String(row[imgIdx] || '').trim() : '';
        const description = descIdx !== -1 ? String(row[descIdx] || '').trim() : '';
        const description_en = descEnIdx !== -1 ? String(row[descEnIdx] || '').trim() : '';
        currentSort++;
        insertProduct.run(name, nameEn, categoryId, price, description, description_en, image, available, currentSort);
        success++;
      }
    });
    tx();
    res.json({ success, failed, skipped, errors: errors.slice(0, 10) });
  } catch (e) {
    res.status(500).json({ error: '导入失败: ' + e.message });
  }
});

module.exports = router;
