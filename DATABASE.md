# Only One BBQ & Tea 数据库字典

> 数据库类型：SQLite（文件：`backend/data.db`）
> 最后更新：2026-09-09
> 说明：所有时间字段使用本地时间（`datetime('now','localtime')`），JSON 字段以 TEXT 存储。

---

## 一、用户与权限

### 1. users — 用户表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 用户ID | 自增主键 | |
| username | TEXT | 登录账号 | 唯一，非空 | |
| password | TEXT | 密码 | 非空 | bcrypt 哈希存储 |
| role | TEXT | 角色 | `user` | `admin`超级管理员 / `manager`管理员 / `employee`员工 / `user`普通用户 |
| name | TEXT | 姓名 | | |
| phone | TEXT | 电话 | | |
| email | TEXT | 邮箱 | | |
| permissions | TEXT | 权限配置 | `{}` | JSON，记录可访问的菜单ID |
| enabled | INTEGER | 是否启用 | `1` | 1启用 / 0禁用 |
| created_at | TEXT | 创建时间 | 当前时间 | |

### 2. role_permissions — 角色权限表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 记录ID | 自增主键 | |
| user_id | INTEGER | 用户ID | | 关联 users.id |
| menu_id | INTEGER | 菜单ID | | 关联 menus.id |
| can_view | INTEGER | 可查看 | `1` | 1是 / 0否 |
| can_edit | INTEGER | 可编辑 | `0` | 1是 / 0否 |

---

## 二、商品与口味

### 3. categories — 商品分类表（一级大类）

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 分类ID | 自增主键 | |
| name | TEXT | 分类中文名 | 非空 | 如"招牌奶茶"、"烧烤串" |
| name_en | TEXT | 分类英文名 | | |
| sort_order | INTEGER | 排序 | `0` | 数字越小越靠前 |
| enabled | INTEGER | 是否启用 | `1` | |

### 4. products — 商品表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 商品ID | 自增主键 | |
| name | TEXT | 商品中文名 | 非空 | |
| name_en | TEXT | 商品英文名 | | |
| category_id | INTEGER | 所属分类ID | | 关联 categories.id |
| price | REAL | 售价（美元） | `0` | |
| description | TEXT | 中文描述 | | |
| description_en | TEXT | 英文描述 | | |
| image | TEXT | 商品图片URL | | |
| available | INTEGER | 是否上架 | `1` | 1上架 / 0下架 |
| is_recommend | INTEGER | 是否推荐 | `0` | 1推荐（首页展示）/ 0否 |
| sort_order | INTEGER | 排序 | `0` | |
| created_at | TEXT | 创建时间 | 当前时间 | |

### 5. flavor_categories — 口味分类表（大类，如"辣度"、"冰度"）

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 分类ID | 自增主键 | |
| name | TEXT | 分类名称 | 非空 | 如"辣度"、"冰度"、"甜度"、"配料" |
| sort_order | INTEGER | 排序 | `0` | |
| enabled | INTEGER | 是否启用 | `1` | 可单独关闭某个大类 |
| category_ids | TEXT | 适用商品分类 | | JSON数组，如`[1,2]`表示只对分类1、2的商品显示；空表示全部适用 |

### 6. flavor_tags — 口味标签表（小类，如"少冰"、"去冰"）

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 标签ID | 自增主键 | |
| category_id | INTEGER | 所属大类ID | | 关联 flavor_categories.id |
| category | TEXT | 大类名称（冗余） | `其他` | 方便查询，避免频繁JOIN |
| name | TEXT | 标签名称 | 非空 | 如"少冰"、"去冰"、"微辣" |
| extra_price | REAL | 额外加价（美元） | `0` | 如"去冰"加1美元 |
| is_default | INTEGER | 是否默认选中 | `0` | 1默认 / 0否；如"正常冰"为默认 |
| sort_order | INTEGER | 排序 | `0` | |
| enabled | INTEGER | 是否启用 | `1` | 可单独关闭某个小类 |

---

## 三、订单与餐桌

### 7. orders — 订单表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 订单ID | 自增主键 | 内部唯一ID |
| order_no | TEXT | 订单号 | 唯一，非空 | 格式`MMDD-NNN`，如`0909-001`，每天从001重置 |
| items | TEXT | 订单商品明细 | 非空 | JSON数组，每项含id/name/price/quantity/note/subtotal |
| subtotal | REAL | 商品小计 | `0` | 不含税和配送费 |
| tax | REAL | 税费 | `0` | 默认税率8.875% |
| delivery_fee | REAL | 配送费 | `0` | 堂吃/自取为0；配送满额免配送 |
| total | REAL | 订单总金额 | `0` | = subtotal + tax + delivery_fee |
| dining_type | TEXT | 用餐方式 | `takeout` | `dinein`堂吃 / `takeout`打包自取 / `delivery`配送 |
| customer_name | TEXT | 顾客姓名 | | 打包/配送必填 |
| customer_phone | TEXT | 顾客电话 | | 打包/配送必填 |
| customer_address | TEXT | 配送地址 | | 仅配送需要 |
| note | TEXT | 订单备注 | | |
| status | TEXT | 订单状态 | `pending` | 见下方"订单状态说明" |
| guest_id | TEXT | 顾客设备标识 | | 前台顾客用，用于查询自己的订单 |
| table_id | INTEGER | 关联餐桌ID | | 仅堂吃有值，关联 tables.id |
| table_session | TEXT | 餐桌会话ID | | 同一桌多次点餐绑定同一会话；清桌后生成新会话 |
| pickup_number | TEXT | 取餐号 | | 当天序号，如"001" |
| start_time | TEXT | 开始制作时间 | | 状态变为preparing时记录 |
| ready_time | TEXT | 制作完成时间 | | 状态变为ready时记录 |
| complete_time | TEXT | 完成时间 | | 状态变为completed时记录 |
| created_at | TEXT | 下单时间 | 当前时间 | |

**订单状态说明：**
- `pending` — 待处理/进行中（刚下单）
- `preparing` — 制作中
- `ready` — 待取餐（打包）/ 配送中（配送）/ 进行中（堂吃）
- `completed` — 已完成
- `cancelled` — 已取消

不同用餐方式的状态流转在 `order_statuses` 表中配置。

### 8. tables — 餐桌表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 餐桌ID | 自增主键 | |
| table_no | TEXT | 桌号 | 唯一，非空 | 如"A1"、"B2" |
| status | TEXT | 餐桌状态 | `idle` | `idle`空闲 / `occupied`占用中 |
| current_session | TEXT | 当前会话ID | | UUID，清桌后重新生成；用于绑定该桌的所有未结算订单 |
| sort_order | INTEGER | 排序 | `0` | |
| created_at | TEXT | 创建时间 | 当前时间 | |

### 9. order_statuses — 订单状态配置表（后台可动态管理）

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 配置ID | 自增主键 | |
| status_key | TEXT | 状态标识 | 非空 | 如`pending`、`preparing`、`ready`、`completed`、`cancelled` |
| dining_type | TEXT | 适用用餐方式 | `all` | `dinein`堂吃 / `takeout`打包 / `delivery`配送 / `all`全部 |
| label | TEXT | 状态显示名称 | 非空 | 如"进行中"、"待取餐"、"已完成" |
| color | TEXT | 标签颜色 | `default` | `primary`/`success`/`warning`/`danger`/`default` |
| sort_order | INTEGER | 排序 | `0` | |
| enabled | INTEGER | 是否启用 | `1` | 可关闭某个状态 |
| is_active | INTEGER | 是否为进行中状态 | `0` | 1表示订单还在处理中（未结束） |
| next_status | TEXT | 下一状态标识 | | 点击"推进"按钮时跳到的状态 |
| next_label | TEXT | 推进按钮文字 | | 如"完成结账"、"确认取餐" |

---

## 四、内容管理

### 10. carousel — 首页轮播图表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 轮播ID | 自增主键 | |
| image | TEXT | 图片URL | | |
| title | TEXT | 标题 | | |
| link | TEXT | 点击跳转链接 | | 点击后通过中转路由`/go?carousel=id`跳转 |
| sort_order | INTEGER | 排序 | `0` | |
| enabled | INTEGER | 是否启用 | `1` | |

### 11. content_blocks — 固定内容区块表（品牌故事、茶品溯源等）

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 区块ID | 自增主键 | |
| block_key | TEXT | 区块标识 | 唯一 | 如`brand_story`、`tea_sourcing`、`craft_philosophy`、`about` |
| title | TEXT | 中文标题 | | |
| title_en | TEXT | 英文标题 | | |
| content | TEXT | 中文内容 | | |
| content_en | TEXT | 英文内容 | | |
| images | TEXT | 图片列表 | `[]` | JSON数组 |
| sort_order | INTEGER | 排序 | `0` | |
| updated_at | TEXT | 更新时间 | 当前时间 | |

### 12. content_sections — 自定义内容板块表（后台可自由添加）

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 板块ID | 自增主键 | |
| title | TEXT | 中文标题 | 非空 | |
| title_en | TEXT | 英文标题 | | |
| content | TEXT | 中文内容 | | |
| content_en | TEXT | 英文内容 | | |
| icon | TEXT | 图标 | `📌` | emoji或图标字符 |
| image | TEXT | 图片URL | | |
| layout | TEXT | 图片位置 | `left` | `left`图片在左 / `right`图片在右 |
| sort_order | INTEGER | 排序 | `0` | |
| enabled | INTEGER | 是否启用 | `1` | |

### 13. new_products — 新品上市表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 新品ID | 自增主键 | |
| name | TEXT | 新品中文名 | 非空 | |
| name_en | TEXT | 新品英文名 | | |
| description | TEXT | 中文描述 | | |
| description_en | TEXT | 英文描述 | | |
| image | TEXT | 图片URL | | |
| sort_order | INTEGER | 排序 | `0` | |
| enabled | INTEGER | 是否启用 | `1` | 无启用的新品时，前台显示"新品正在制作中"提示 |

---

## 五、外卖平台

### 14. platforms — 外卖平台表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 平台ID | 自增主键 | |
| name | TEXT | 平台名称 | 非空 | 如"Uber Eats"、"DoorDash" |
| logo | TEXT | Logo图片URL | | |
| url | TEXT | 平台后台地址 | | 点击后通过中转路由`/go?platform=id`跳转，不直接暴露URL |
| account | TEXT | 登录账号 | | |
| password | TEXT | 登录密码 | | 仅admin角色可见 |
| phone | TEXT | 联系电话 | | 部分平台用电话登录（如Yelp） |
| note | TEXT | 备注 | | |
| enabled | INTEGER | 是否启用 | `1` | |
| weekly_status | TEXT | 每周上下架状态 | `{}` | JSON，记录每周缺货/上下架信息 |
| sort_order | INTEGER | 排序 | `0` | |
| created_at | TEXT | 创建时间 | 当前时间 | |

---

## 六、菜单与表单

### 15. menus — 后台侧边栏菜单表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 菜单ID | 自增主键 | |
| parent_id | INTEGER | 父菜单ID | `0` | 0表示一级菜单；最多二级 |
| name | TEXT | 菜单名称 | 非空 | |
| icon | TEXT | 图标 | | emoji |
| path | TEXT | 路由路径 | | 如`/admin/products` |
| sort_order | INTEGER | 排序 | `0` | |
| enabled | INTEGER | 是否启用 | `1` | |

### 16. forms — 动态表单表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 表单ID | 自增主键 | |
| name | TEXT | 表单名称 | 非空 | 如"员工入职表" |
| description | TEXT | 表单描述 | | |
| fields | TEXT | 表单字段配置 | `[]` | JSON数组，每个字段含type/label/options/required等 |
| enabled | INTEGER | 是否启用 | `1` | |
| created_at | TEXT | 创建时间 | 当前时间 | |

### 17. form_submissions — 表单提交记录表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 记录ID | 自增主键 | |
| form_id | INTEGER | 所属表单ID | | 关联 forms.id |
| data | TEXT | 提交数据 | `{}` | JSON对象，键为字段名，值为用户填写内容 |
| created_at | TEXT | 提交时间 | 当前时间 | |

---

## 七、员工考勤

### 18. attendance — 打卡记录表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 记录ID | 自增主键 | |
| user_id | INTEGER | 用户ID | 非空 | 关联 users.id |
| user_name | TEXT | 用户姓名 | | 冗余字段，方便查询 |
| date | TEXT | 日期 | 非空 | 格式`YYYY-MM-DD`，本地日期 |
| clock_in | TEXT | 上班打卡时间 | | 格式`HH:MM:SS`；一天可多次打卡，取最早为上班时间 |
| clock_out | TEXT | 下班打卡时间 | | 格式`HH:MM:SS`；一天可多次打卡，取最晚为下班时间 |
| created_at | TEXT | 记录创建时间 | 当前时间 | |

---

## 八、备忘录

### 19. memos — 备忘录/待办事项表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 记录ID | 自增主键 | |
| title | TEXT | 标题 | 非空 | |
| content | TEXT | 内容 | | |
| type | TEXT | 类型 | `memo` | `memo`备忘录 / `todo`待办 / `important`重点事项 |
| priority | TEXT | 优先级 | `normal` | `high`高 / `normal`普通 / `low`低 |
| completed | INTEGER | 是否完成 | `0` | 1完成 / 0未完成 |
| created_at | TEXT | 创建时间 | 当前时间 | |

---

## 九、系统设置

### 20. settings — 系统设置表（键值对）

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| key | TEXT | 设置键 | 主键 | 见下方"常用设置键" |
| value | TEXT | 设置值 | | JSON或纯文本，读取时按需JSON.parse |

**常用设置键：**

| key | 含义 | 示例值 |
|-----|------|--------|
| store_name | 店铺中文名 | Only One BBQ & Tea |
| store_name_en | 店铺英文名 | Only One BBQ & Tea |
| tax_rate | 税率 | 0.08875（8.875%） |
| phone | 店铺电话 | |
| address | 店铺地址 | 162-01 Sanford Ave, Flushing, NY |
| delivery_range_miles | 配送范围（英里） | 3 |
| free_delivery_min | 免配送费最低金额 | 30 |
| delivery_fee | 配送费 | 3.99 |
| business_hours | 营业时间 | JSON，周一至周日独立配置，周二默认休息 |
| brand_story | 品牌故事（中文） | |
| brand_story_en | 品牌故事（英文） | |
| tea_sourcing | 茶品溯源 | JSON数组，每项含name/name_en/desc/desc_en/image/enabled |
| craft_philosophy | 奶茶工艺理念 | JSON数组 |
| language | 默认语言 | zh |

---

## 十、货物与进货（库存管理）

### 21. goods — 货物表（原材料/库存）

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 货物ID | 自增主键 | |
| name | TEXT | 货物名称 | 非空 | 如"羊肉"、"珍珠"、"牛奶" |
| name_en | TEXT | 货物英文名 | | |
| unit | TEXT | 单位 | `个` | 如"磅"、"升"、"箱" |
| current_stock | REAL | 当前库存 | `0` | 进货时自动增加 |
| avg_price | TEXT | 平均进价 | `0` | 多次进货取平均 |
| supplier | TEXT | 供应商 | | |
| category | TEXT | 货物分类 | | 如"肉类"、"饮品原料" |
| note | TEXT | 备注 | | |
| created_at | TEXT | 创建时间 | 当前时间 | |
| updated_at | TEXT | 更新时间 | 当前时间 | |

### 22. purchase_orders — 进货单表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 进货单ID | 自增主键 | |
| order_no | TEXT | 进货单号 | | |
| supplier | TEXT | 供应商 | 非空 | |
| order_date | TEXT | 进货日期 | 非空 | 格式`YYYY-MM-DD` |
| total_amount | REAL | 总金额 | `0` | = 明细合计 + 配送费 - 折扣 |
| delivery_fee | REAL | 配送费 | `0` | |
| discount | REAL | 折扣 | `0` | |
| payment_method | TEXT | 支付方式 | `COD` | COD货到付款 / 其他 |
| note | TEXT | 备注 | | |
| created_at | TEXT | 创建时间 | 当前时间 | |

### 23. purchase_order_items — 进货单明细表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 明细ID | 自增主键 | |
| purchase_order_id | INTEGER | 所属进货单ID | 非空 | 关联 purchase_orders.id，级联删除 |
| goods_id | INTEGER | 关联货物ID | | 关联 goods.id；为空时根据名称自动创建货物 |
| goods_name | TEXT | 货物名称 | 非空 | 冗余字段 |
| quantity | REAL | 数量 | `0` | |
| unit | TEXT | 单位 | `个` | |
| unit_price | REAL | 单价 | `0` | |
| subtotal | REAL | 小计 | `0` | = quantity × unit_price |

---

## 十一、利润计算

### 24. profit_records — 利润计算历史记录表

| 字段名 | 类型 | 含义 | 默认值 | 备注 |
|--------|------|------|--------|------|
| id | INTEGER | 记录ID | 自增主键 | |
| product_id | INTEGER | 关联商品ID | | 关联 products.id，可为空 |
| product_name | TEXT | 菜品名称 | 非空 | |
| purchase_price | REAL | 采购总价（美元） | `0` | |
| purchase_qty | REAL | 采购总量 | `0` | |
| unit | TEXT | 采购单位 | `磅` | |
| portion_per_unit | REAL | 每单位出几份 | `0` | 如1磅羊肉出4串 |
| sell_price | REAL | 每份售价（美元） | `0` | |
| created_at | TEXT | 记录时间 | 当前时间 | |

**利润计算公式：**
- 每单位成本 = 采购总价 ÷ 采购总量
- 每份成本 = 每单位成本 ÷ 每单位出几份
- 每份利润 = 每份售价 - 每份成本
- 利润率 = 每份利润 ÷ 每份售价 × 100%
- 总可出份数 = 采购总量 × 每单位出几份
- 全部卖完营收 = 总可出份数 × 每份售价
- 全部卖完利润 = 全部卖完营收 - 采购总价
- 回本次数 = 采购总价 ÷ 每份利润（向上取整）

---

## 附录：表关系图

```
users ──< role_permissions >── menus
  │
  └──< attendance

categories ──< products
                  │
flavor_categories ──< flavor_tags
     │
     └── (category_ids 关联商品分类)

tables ──< orders >── products (通过 items JSON)
            │
            └── order_statuses (配置状态流转)

carousel
content_blocks
content_sections
new_products

platforms

forms ──< form_submissions

memos

settings (键值对)

goods ──< purchase_order_items >── purchase_orders

profit_records (关联 products)
```

---

## 维护说明

1. **新增表/字段**：在 `backend/src/db.js` 的 `db.exec()` 中添加 `CREATE TABLE IF NOT EXISTS`，并在下方数据迁移区域用 `PRAGMA table_info` 检查后 `ALTER TABLE ADD COLUMN` 兼容旧数据库。
2. **JSON 字段**：所有 TEXT 存储的 JSON 字段，读取时用 `JSON.parse()`，写入时用 `JSON.stringify()`。
3. **时间字段**：统一使用 `datetime('now','localtime')` 存储本地时间，避免 UTC 时区问题。
4. **SQL 注意**：SQLite 中字符串用单引号 `''`，双引号 `""` 是列名标识符；空字符串必须写 `''`。
5. **数据库文件**：`backend/data.db`，可直接复制到其他电脑使用；建议用 DB Browser for SQLite 可视化查看。
