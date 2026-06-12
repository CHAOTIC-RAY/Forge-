import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Bold, Italic, Strikethrough, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const buttons = [
    {
      icon: <Bold className="w-4 h-4" />,
      onClick: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      icon: <Italic className="w-4 h-4" />,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      icon: <Strikethrough className="w-4 h-4" />,
      onClick: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive('strike'),
    },
    {
      icon: <span className="w-4 h-4 flex items-center justify-center font-bold">P</span>, // Paragraph
      onClick: () => editor.chain().focus().setParagraph().run(),
      isActive: editor.isActive('paragraph'),
    },
    {
      icon: <List className="w-4 h-4" />,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      icon: <ListOrdered className="w-4 h-4" />,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
    {
      icon: <Quote className="w-4 h-4" />,
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
    },
    {
      icon: <Undo className="w-4 h-4" />,
      onClick: () => editor.chain().focus().undo().run(),
      disabled: !editor.can().chain().focus().undo().run(),
    },
    {
      icon: <Redo className="w-4 h-4" />,
      onClick: () => editor.chain().focus().redo().run(),
      disabled: !editor.can().chain().focus().redo().run(),
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] rounded-t-[8px]">
      {buttons.map((btn, idx) => (
        <button
          key={idx}
          type="button"
          onClick={btn.onClick}
          disabled={btn.disabled}
          className={`p-1.5 rounded hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] transition-colors ${
            btn.isActive ? 'bg-[#F7F7F5] dark:bg-[#2E2E2E] text-brand' : 'text-[#757681] dark:text-[#9B9A97]'
          } ${btn.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, readOnly }) => {
  const isUpdatingValue = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || 'Write something...',
      }),
      CharacterCount,
    ],
    content: value,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] p-4 text-[#37352F] dark:text-[#EBE9ED]',
      },
    },
    onUpdate: ({ editor }) => {
      isUpdatingValue.current = true;
      // Use getHTML() for rich text, or getText() for plain text. We use getHTML() to preserve rich text.
      const html = editor.getHTML();
      onChange(html);
      setTimeout(() => {
        isUpdatingValue.current = false;
      }, 0);
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML() && !isUpdatingValue.current) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[8px] overflow-hidden ${readOnly ? 'opacity-70 bg-[#F7F7F5] dark:bg-[#202020]' : 'bg-[#F7F7F5] dark:bg-[#202020]'}`}>
      {!readOnly && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
      <div className="flex justify-end p-2 border-t border-[#E9E9E7] dark:border-[#2E2E2E] text-xs text-[#757681]">
        {editor.storage.characterCount.characters()} characters
      </div>
    </div>
  );
};
