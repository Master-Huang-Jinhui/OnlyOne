import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function ProductVariantModal({ visible, onClose, onConfirm, initData }) {
  const { t } = useLanguage();
  // 单选组：辣度、冰度、甜度
  const [spicy, setSpicy] = useState(initData?.spicy || "不辣");
  const [ice, setIce] = useState(initData?.ice || "正常冰");
  const [sugar, setSugar] = useState(initData?.sugar || "正常糖");

  // 多选组：配料、其它
  const [toppings, setToppings] = useState(initData?.toppings || []);
  const [others, setOthers] = useState(initData?.others || []);

  // 选项定义：value 为内部稳定值，key 为翻译键
  const spicyOptions = [
    { value: "不辣", key: "variant.spicyNone" },
    { value: "微辣", key: "variant.spicyMild" },
    { value: "少辣", key: "variant.spicyLess" },
    { value: "中辣", key: "variant.spicyMedium" },
    { value: "特辣", key: "variant.spicyVery" },
  ];
  const iceOptions = [
    { value: "去冰 +$1.00", key: "variant.iceNo", price: "+$1.00" },
    { value: "少冰", key: "variant.iceLess" },
    { value: "正常冰", key: "variant.iceNormal" },
    { value: "多冰", key: "variant.iceMore" },
    { value: "热饮", key: "variant.iceHot" },
  ];
  const sugarOptions = [
    { value: "无糖", key: "variant.sugarNone" },
    { value: "半糖", key: "variant.sugarHalf" },
    { value: "少糖", key: "variant.sugarLess" },
    { value: "正常糖", key: "variant.sugarNormal" },
    { value: "全糖", key: "variant.sugarFull" },
  ];
  const toppingOptions = [
    { value: "加珍珠 +$0.75", key: "variant.toppingPearl", price: "+$0.75" },
    { value: "加椰果 +$0.75", key: "variant.toppingCoconut", price: "+$0.75" },
    { value: "加布丁 +$0.75", key: "variant.toppingPudding", price: "+$0.75" },
    { value: "加芋圆 +$1.00", key: "variant.toppingTaro", price: "+$1.00" },
  ];
  const otherOptions = [
    { value: "不要葱", key: "variant.noScallion" },
    { value: "不要香菜", key: "variant.noCilantro" },
    { value: "不要蒜", key: "variant.noGarlic" },
    { value: "打包", key: "variant.toGo" },
  ];

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
          <h3 className="text-xl font-semibold">{t('variant.selectFlavor', '选择口味')}</h3>
          <button onClick={onClose} className="text-gray-500 text-xl">×</button>
        </div>

        {/* 辣度【单选】 */}
        <div className="mt-4">
          <div className="text-lg font-medium mb-2">{t('variant.spicy', '辣度')}</div>
          <div className="flex flex-wrap gap-2">
            {spicyOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSpicy(opt.value)}
                className={`px-3 py-2 rounded-lg border-2 text-sm whitespace-nowrap
                ${spicy === opt.value ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"}`}
              >{t(opt.key, opt.value)}</button>
            ))}
          </div>
        </div>

        {/* 冰度【单选】 */}
        <div className="mt-4">
          <div className="text-lg font-medium mb-2">{t('variant.ice', '冰度')}</div>
          <div className="flex flex-wrap gap-2">
            {iceOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleIce(opt.value)}
                className={`px-3 py-2 rounded-lg border-2 text-sm whitespace-nowrap
                ${ice === opt.value ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"}`}
              >{t(opt.key, opt.value.replace(/ \+.*$/, ''))}{opt.price && ` ${opt.price}`}</button>
            ))}
          </div>
        </div>

        {/* 甜度【单选】 */}
        <div className="mt-4">
          <div className="text-lg font-medium mb-2">{t('variant.sugar', '甜度')}</div>
          <div className="flex flex-wrap gap-2">
            {sugarOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSugar(opt.value)}
                className={`px-3 py-2 rounded-lg border-2 text-sm whitespace-nowrap
                ${sugar === opt.value ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"}`}
              >{t(opt.key, opt.value)}</button>
            ))}
          </div>
        </div>

        {/* 配料【多选】 */}
        <div className="mt-4">
          <div className="text-lg font-medium mb-2">{t('variant.toppings', '配料')}</div>
          <div className="flex flex-wrap gap-2">
            {toppingOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => toggleTopping(opt.value)}
                className={`px-3 py-2 rounded-lg border-2 text-sm whitespace-nowrap
                ${toppings.includes(opt.value) ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"}`}
              >{t(opt.key, opt.value.replace(/ \+.*$/, ''))}{opt.price && ` ${opt.price}`}</button>
            ))}
          </div>
        </div>

        {/* 其他【多选】 */}
        <div className="mt-4">
          <div className="text-lg font-medium mb-2">{t('variant.others', '其他')}</div>
          <div className="flex flex-wrap gap-2">
            {otherOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => toggleOther(opt.value)}
                className={`px-3 py-2 rounded-lg border-2 text-sm whitespace-nowrap
                ${others.includes(opt.value) ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"}`}
              >{t(opt.key, opt.value)}</button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 py-3 border-2 border-gray-300 rounded-xl text-base"
          >{t('variant.clear', '清空')}</button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-base"
          >{t('common.confirm', '确认')}</button>
        </div>
      </div>
    </div>
  );
}