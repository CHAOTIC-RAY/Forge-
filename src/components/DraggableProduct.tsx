import React from 'react';

export function DraggableProduct({ product }: any) {
  return (
    <div className="p-3 border border-gray-100 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-between">
      <div>
        <h4 className="font-semibold text-xs text-gray-800 dark:text-zinc-200">{product.title}</h4>
        <p className="text-[10px] text-gray-500">${product.price}</p>
      </div>
    </div>
  );
}
export default DraggableProduct;
