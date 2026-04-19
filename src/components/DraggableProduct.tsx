import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '../lib/utils';
import { HighStockProduct } from '../lib/gemini';
import { Image as ImageIcon, ExternalLink, Copy, Trash2, Tag, Info, BookOpen, Sparkles, Share2 } from 'lucide-react';
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
    { label: dbMode === 'info' ? 'View Full Insight' : 'View Details', icon: <Info className="w-3.5 h-3.5" />, onClick: () => onClick?.() },
    { label: 'Copy Title', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => {
      navigator.clipboard.writeText(product.title);
      toast.success("Title copied!");
    }},
    { 
      label: 'Copy Summary', 
      icon: <Copy className="w-3.5 h-3.5" />, 
      disabled: !product.stockInfo,
      onClick: () => {
        navigator.clipboard.writeText(product.stockInfo || "");
        toast.success("Summary copied!");
      }
    },
    { 
      label: 'Open Source', 
      icon: <ExternalLink className="w-3.5 h-3.5" />, 
      disabled: !product.link,
      onClick: () => product.link && window.open(product.link, '_blank') 
    },
    { 
      label: 'Delete', 
      icon: <Trash2 className="w-3.5 h-3.5" />, 
      variant: 'danger',
      onClick: () => onDelete?.(product)
    },
  ];

  const isInfo = dbMode === 'info';

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
          "bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] p-4 cursor-grab active:cursor-grabbing hover:border-blue-500/50 hover:shadow-lg transition-all group",
          viewMode === 'grid' ? "flex flex-col gap-3" : "flex flex-row items-center gap-4",
          isDragging && "opacity-50 scale-105",
          isSelected && "border-[#2383E2] ring-2 ring-[#2383E2]/20 bg-blue-50/10 dark:bg-blue-900/5",
          isInfo && "border-l-4 border-l-[#2383E2]"
        )}
      >
      {viewMode === 'grid' ? (
        <>
          <div className="flex items-center justify-between">
            <span className={cn(
               "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
               isInfo ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            )}>
              {product.type || 'Insight'}
            </span>
            {isInfo && (
              <div className="flex items-center gap-1 text-[#9B9A97]">
                <Sparkles className="w-3 h-3" />
                <span className="text-[10px] font-bold">Forge AI</span>
              </div>
            )}
          </div>

          <div className="flex-1">
            <h4 className={cn(
              "text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] leading-snug group-hover:text-[#2383E2] transition-colors",
              isInfo ? "line-clamp-2" : "line-clamp-1"
            )}>
              {product.title}
            </h4>
            
            {product.stockInfo && (
              <p className={cn(
                "text-xs text-[#757681] dark:text-[#9B9A97] leading-relaxed mt-2",
                isInfo ? "line-clamp-4" : "line-clamp-2"
              )}>
                {product.stockInfo}
              </p>
            )}
          </div>

          {isInfo ? (
            <div className="mt-2 pt-3 border-t border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between text-[#9B9A97]">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Brand Intel</span>
              </div>
              {product.link && (
                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          ) : (
             product.link && (
              <div className="w-full h-24 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] overflow-hidden flex items-center justify-center border border-[#E9E9E7] dark:border-[#2E2E2E] shrink-0 mt-2">
                 <ImageIcon className="w-8 h-8 text-[#9B9A97] opacity-20" />
              </div>
            )
          )}
        </>
      ) : (
        <>
          <div className={cn(
            "w-12 h-12 rounded-[12px] flex items-center justify-center shrink-0 border border-[#E9E9E7] dark:border-[#2E2E2E]",
            isInfo ? "bg-blue-50 dark:bg-blue-900/10 text-blue-600" : "bg-[#F7F7F5] dark:bg-[#202020]"
          )}>
            {isInfo ? <BookOpen className="w-6 h-6" /> : <ImageIcon className="w-6 h-6 text-[#9B9A97] opacity-20" />}
          </div>
          
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                isInfo ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
              )}>
                {product.type}
              </span>
            </div>
            <h4 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED] truncate">
              {product.title}
            </h4>
            {product.stockInfo && (
              <p className="text-xs text-[#757681] dark:text-[#9B9A97] line-clamp-1 leading-relaxed">
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
