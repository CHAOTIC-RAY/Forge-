import React from 'react';
import {
  PenTool,
  Target,
  Image as ImageIcon,
  Wand2,
  Link,
  Link2,
  Banana,
  LayoutGrid,
} from 'lucide-react';

export type WidgetCategory = 'write' | 'image' | 'utility';

export interface BuiltinWidgetDefinition {
  id: string;
  title: string;
  description: string;
  category: WidgetCategory;
  icon: React.ReactNode;
  color: string;
  requiresAI?: boolean;
}

export const WIDGET_CATEGORY_LABELS: Record<WidgetCategory, string> = {
  write: 'Write',
  image: 'Image',
  utility: 'Utility',
};

export const BUILTIN_WIDGET_CATALOG: BuiltinWidgetDefinition[] = [
  {
    id: 'copywriting',
    title: 'Copywriter',
    description: 'Captions, ads, product copy, and social posts using your brand voice.',
    category: 'write',
    icon: <PenTool className="w-6 h-6 text-brand" />,
    color: 'bg-brand-bg',
    requiresAI: true,
  },
  {
    id: 'frameworks',
    title: 'Marketing frameworks',
    description: 'AIDA, PAS, and BAB structured copy for campaigns.',
    category: 'write',
    icon: <Target className="w-6 h-6 text-purple-500" />,
    color: 'bg-purple-500/10',
    requiresAI: true,
  },
  {
    id: 'urlToCampaign',
    title: 'URL to campaign',
    description: 'Turn a blog post or article into multi-platform social copy.',
    category: 'write',
    icon: <Link className="w-6 h-6 text-orange-500" />,
    color: 'bg-orange-500/10',
    requiresAI: true,
  },
  {
    id: 'bulk',
    title: 'Bulk post ideas',
    description: 'Generate a batch of post ideas and save to calendar or Ideas inbox.',
    category: 'write',
    icon: <Wand2 className="w-6 h-6 text-emerald-500" />,
    color: 'bg-emerald-500/10',
    requiresAI: true,
  },
  {
    id: 'resizer',
    title: 'Image resizer',
    description: 'Resize and crop images for each social platform.',
    category: 'image',
    icon: <ImageIcon className="w-6 h-6 text-pink-500" />,
    color: 'bg-pink-500/10',
  },
  {
    id: 'nano-upscaler',
    title: 'Image upscaler',
    description: 'Enhance image resolution with AI upscaling.',
    category: 'image',
    icon: <Banana className="w-6 h-6 text-yellow-500" />,
    color: 'bg-yellow-500/10',
  },
  {
    id: 'shortener',
    title: 'Link shortener',
    description: 'Create trackable short links for campaigns.',
    category: 'utility',
    icon: <Link2 className="w-6 h-6 text-indigo-500" />,
    color: 'bg-indigo-500/10',
  },
];

export function getWidgetsByCategory(category: WidgetCategory): BuiltinWidgetDefinition[] {
  return BUILTIN_WIDGET_CATALOG.filter((w) => w.category === category);
}

export function getBuiltinWidget(id: string): BuiltinWidgetDefinition | undefined {
  return BUILTIN_WIDGET_CATALOG.find((w) => w.id === id);
}

export const WIDGET_TAB_ICON = <LayoutGrid className="w-5 h-5" />;
