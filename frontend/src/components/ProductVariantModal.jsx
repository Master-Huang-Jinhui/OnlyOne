import { useState } from 'react';

export default function ProductVariantModal({ visible, onClose, onConfirm, initData }) {
  // 单选组：辣度、冰度、甜度
  const [spicy, setSpicy] = useState(initData?.spicy || "不辣");
  const [ice, setIce] = useState(initData?.ice || "正常冰");
  const [sugar, setSugar] = useState(initData?.sugar || "正常糖");

  // 多选组：配料、其它
  const [toppings, setToppings] = useState(initData?.toppings || []);
  const [others, setOthers] = useState(initData?.others || []);

  // 单选赋值
  const handleSpicy = (v) => setSpicy(v);
  const handleIce = (v) => setIce(v);
  const handleSugar = (v) => setSugar(v);

  // 多选切换
  const toggleTopping = (v) => {
    setToppings(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };
  const toggleOther = (v) => {
    setOthers(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };

  // 确认
  const handleConfirm = () => {
    const selectResult = {
      spicy,
      ice,
      sugar,
      toppings,
      others
    };
    onConfirm(selectResult);
    onClose();
  };

  // 清空重置
  const handleClear = () => {
    setSpicy("不辣");
    setIce("正常冰");
    setSugar("正常糖");
    setToppings([]);
    setOthers([]);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      {/* modal 手机占满宽度 */}
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">选择口味</h3>
          <button onClick={onClose} className="text-gray-500 text-xl">×</button>
        </div>

        {/* 辣度【单选】 */}
        <div className="mt-4">
          <div className="text-lg font-medium mb-2">辣度</div>
          <div className="flex flex-wrap gap-2">
            {["不辣", "微辣", "少辣", "中辣", "特辣"].map(item => (
              <button
                key={item}
                onClick={() => handleSpicy(item)}
                className={`px-3 py-2 rounded-lg border-2 text-sm whitespace-nowrap
                ${spicy === item ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"}`}
              >{item}</button>
            ))}
          </div>
        </div>

        {/* 冰度【单选】 */}
        <div className="mt-4">
          <div className="text-lg font-medium mb-2">冰度</div>
          <div className="flex flex-wrap gap-2">
            {["去冰 +$1.00", "少冰", "正常冰", "多冰", "热饮"].map(item => (
              <button
                key={item}
                onClick={() => handleIce(item)}
                className={`px-3 py-2 rounded-lg border-2 text-sm whitespace-nowrap
                ${ice === item ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"}`}
              >{item}</button>
            ))}
          </div>
        </div>

        {/* 甜度【单选】 */}
        <div className="mt-4">
          <div className="text-lg font-medium mb-2">甜度</div>
          <div className="flex flex-wrap gap-2">
            {["无糖", "半糖", "少糖", "正常糖", "全糖"].map(item => (
              <button
                key={item}
                onClick={() => handleSugar(item)}
                className={`px-3 py-2 rounded-lg border-2 text-sm whitespace-nowrap
                ${sugar === item ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"}`}
              >{item}</button>
            ))}
          </div>
        </div>

        {/* 配料【多选】 */}
        <div className="mt-4">
          <div className="text-lg font-medium mb-2">配料</div>
          <div className="flex flex-wrap gap-2">
            {["加珍珠 +$0.75", "加椰果 +$0.75", "加布丁 +$0.75", "加芋圆 +$1.00"].map(item => (
              <button
                key={item}
                onClick={() => toggleTopping(item)}
                className={`px-3 py-2 rounded-lg border-2 text-sm whitespace-nowrap
                ${toppings.includes(item) ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"}`}
              >{item}</button>
            ))}
          </div>
        </div>

        {/* 其他【多选】 */}
        <div className="mt-4">
          <div className="text-lg font-medium mb-2">其他</div>
          <div className="flex flex-wrap gap-2">
            {["不要葱", "不要香菜", "不要蒜", "打包"].map(item => (
              <button
                key={item}
                onClick={() => toggleOther(item)}
                className={`px-3 py-2 rounded-lg border-2 text-sm whitespace-nowrap
                ${others.includes(item) ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"}`}
              >{item}</button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 py-3 border-2 border-gray-300 rounded-xl text-base"
          >清空</button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-base"
          >确认</button>
        </div>
      </div>
    </div>
  );
}
