export const flavorTags = [
  { category: '辣度', name: '不辣', extraPrice: 0 },
  { category: '辣度', name: '微辣', extraPrice: 0 },
  { category: '辣度', name: '少辣', extraPrice: 0 },
  { category: '辣度', name: '中辣', extraPrice: 0 },
  { category: '辣度', name: '特辣', extraPrice: 0 },
  { category: '冰度', name: '去冰', extraPrice: 1 },
  { category: '冰度', name: '少冰', extraPrice: 0 },
  { category: '冰度', name: '正常冰', extraPrice: 0 },
  { category: '冰度', name: '多冰', extraPrice: 0 },
  { category: '冰度', name: '热饮', extraPrice: 0 },
  { category: '甜度', name: '无糖', extraPrice: 0 },
  { category: '甜度', name: '半糖', extraPrice: 0 },
  { category: '甜度', name: '少糖', extraPrice: 0 },
  { category: '甜度', name: '正常糖', extraPrice: 0 },
  { category: '甜度', name: '全糖', extraPrice: 0 },
  { category: '配料', name: '加珍珠', extraPrice: 0.75 },
  { category: '配料', name: '加椰果', extraPrice: 0.75 },
  { category: '配料', name: '加布丁', extraPrice: 0.75 },
  { category: '配料', name: '加芋圆', extraPrice: 1 },
  { category: '其他', name: '不要葱', extraPrice: 0 },
  { category: '其他', name: '不要香菜', extraPrice: 0 },
  { category: '其他', name: '不要蒜', extraPrice: 0 },
  { category: '其他', name: '打包', extraPrice: 0 },
]

export const getTagInfo = (tagName) => flavorTags.find(t => t.name === tagName) || { name: tagName, extraPrice: 0, category: '自定义' }

export const calcTagsExtraPrice = (tags = []) => tags.reduce((sum, tagName) => sum + (getTagInfo(tagName).extraPrice || 0), 0)
