import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '../lib/utils';
import { HighStockProduct } from '../lib/gemini';
import { Image as ImageIcon, ExternalLink, Copy, Trash2, Tag, Info } from 'lucide-react';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { toast } from 'sonner';

import { DbMode } from './LocalDb';

export function DraggableProduct({ product, onClick, isSelected, viewMode = 'grid', onDelete, dbMode = 'product' }: { product: HighStockProduct, onClick?: () => void, isSelected?: boolean, viewMode?: 'grid' | 'list', key?: React.Key, onDelete?: (p: HighStockProduct) => void, dbMode?: DbMode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `product:${product.title}`,
    data: { type: 'product', product }
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 100 : 1,
  };

  const contextMenuItems: ContextMenuItem[] = [
    { label: 'View Details', icon: <Info className="w-3.5 h-3.5" />, onClick: () => onClick?.() },
    { label: 'Copy Title', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => {
      navigator.clipboard.writeText(product.title);
      toast.success("Title copied!");
    }},
    { 
      label: 'Open Link', 
      icon: <ExternalLink className="w-3.5 h-3.5" />, 
      disabled: !product.link,
      onClick: () => product.link && window.open(product.link, '_blank') 
    },
    { label: 'Auto-categorize', icon: <Tag className="w-3.5 h-3.5" />, onClick: () => toast.info("Categorizing...") },
    { 
      label: 'Delete Product', 
      icon: <Trash2 className="w-3.5 h-3.5" />, 
      variant: 'danger',
      onClick: () => onDelete?.(product)
    },
  ];

  return (
    <ContextMenu items={contextMenuItems}>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={(e) => {
          if (onClick) onClick();
        }}
        className={cn(
          "bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-md p-2 shadow-sm cursor-grab active:cursor-grabbing hover:border-[#2383E2] transition-all",
          viewMode === 'grid' ? "flex flex-col gap-2" : "flex flex-row items-center gap-4",
          isDragging && "opacity-50 shadow-lg scale-105",
          isSelected && "border-[#2383E2] ring-1 ring-[#2383E2] bg-blue-50/30 dark:bg-blue-900/10"
        )}
      >
      {viewMode === 'grid' ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#2383E2] uppercase tracking-wider bg-[#2383E2]/10 px-1.5 rounded">
              {product.type}
            </span>
            {(product.price || (dbMode === 'info' && product.stockInfo)) && (
              <span className="text-[10px] font-bold text-[#787774] dark:text-[#9B9A97]">
                {dbMode === 'info' ? 'Insight' : product.price}
              </span>
            )}
          </div>
          <h4 className="text-xs font-semibold text-[#37352F] dark:text-[#EBE9ED] line-clamp-2 leading-tight">
            {product.title}
          </h4>
          {dbMode === 'info' && product.stockInfo && (
            <p className="text-[10px] text-[#787774] dark:text-[#9B9A97] line-clamp-3 leading-relaxed mt-1">
              {product.stockInfo}
            </p>
          )}
          {product.link && (
            <div className="w-full h-20 bg-[#F7F7F5] dark:bg-[#202020] rounded overflow-hidden flex items-center justify-center border border-[#E9E9E7] dark:border-[#2E2E2E] shrink-0">
               <ImageIcon className="w-6 h-6 text-[#9B9A97] opacity-20" />
            </div>
          )}
        </>
      ) : (
        <>
          {product.link && (
            <div className="w-16 h-16 bg-[#F7F7F5] dark:bg-[#202020] rounded overflow-hidden flex items-center justify-center border border-[#E9E9E7] dark:border-[#2E2E2E] shrink-0">
               <ImageIcon className="w-6 h-6 text-[#9B9A97] opacity-20" />
            </div>
          )}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#2383E2] uppercase tracking-wider bg-[#2383E2]/10 px-1.5 rounded shrink-0">
                {product.type}
              </span>
              {(product.price || (dbMode === 'info' && product.stockInfo)) && (
                <span className="text-[10px] font-bold text-[#787774] dark:text-[#9B9A97] shrink-0">
                  {dbMode === 'info' ? 'Insight' : product.price}
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-[#37352F] dark:text-[#EBE9ED] truncate">
              {product.title}
            </h4>
            {dbMode === 'info' && product.stockInfo && (
              <p className="text-[10px] text-[#787774] dark:text-[#9B9A97] line-clamp-1 leading-relaxed">
                {product.stockInfo}
              </p>
            )}
          </div>
        </>
      )}
      </div>
    </ContextMenu>
  );
}
