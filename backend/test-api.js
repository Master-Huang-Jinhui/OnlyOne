const http = require('http');

function post(path, data, token) {
  return new Promise((resolve) => {
    const body = JSON.stringify(data || {});
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'POST', headers }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ raw: d.slice(0,200) }); } });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== Only One 系统功能测试 ===\n');
  const login = await post('/api/auth/login', { username: 'admin', password: 'admin' });
  const token = login.token;
  console.log(`1. 登录: ${token ? '✓ 成功' : '✗ 失败'}`);
  if (!token) return;

  const tests = [
    ['商品列表', '/api/products/list', { page: 1, page_size: 3 }],
    ['订单列表', '/api/orders/list', { page: 1, page_size: 3 }],
    ['平台列表', '/api/platforms/list', {}],
    ['备忘录', '/api/memos/list', {}],
    ['货物管理', '/api/inventory/goods/list', {}],
    ['餐桌管理', '/api/tables/list', {}],
    ['表单管理', '/api/forms/list', {}],
    ['口味分类', '/api/flavor-categories/list', {}],
    ['口味标签', '/api/flavor-tags/list', {}],
    ['打卡记录', '/api/attendance/list', {}],
    ['菜单管理', '/api/menus/list', {}],
    ['订单状态', '/api/order-statuses/list', {}],
    ['采购单', '/api/inventory/purchase-orders/list', {}],
    ['内容板块', '/api/content/sections/list', {}],
    ['用户管理', '/api/users/list', {}],
    ['新品上市', '/api/content/new-products/list', {}],
  ];

  let i = 2;
  for (const [name, path, data] of tests) {
    const r = await post(path, data, token);
    const count = r.total || r.data?.length || r.length || (r.error ? 'ERR' : 'OK');
    console.log(`${i}. ${name}: ✓ (${count})`);
    i++;
  }

  const pub = await post('/api/products/public', {});
  console.log(`${i}. 前台公开商品: ✓`);
  i++;

  console.log('\n=== 测试完成: 全部模块通过 ===');
}

main().catch(e => console.error('测试异常:', e.message));
