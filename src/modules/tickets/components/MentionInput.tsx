import { useState, useRef, useEffect } from 'react';

interface User {
  id: string;
  full_name: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  users: User[];
  placeholder?: string;
  onMention?: (userId: string) => void;
}

export default function MentionInput({
  value,
  onChange,
  users,
  placeholder,
  onMention,
}: MentionInputProps) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  useEffect(() => {
    const lastAtIndex = value.lastIndexOf('@', cursorPos);
    if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1, cursorPos);
      if (!afterAt.includes(' ') && afterAt.length < 30) {
        setMentionQuery(afterAt);
        setMentionOpen(true);
        return;
      }
    }
    setMentionOpen(false);
  }, [value, cursorPos]);

  const insertMention = (user: User) => {
    const lastAtIndex = value.lastIndexOf('@', cursorPos);
    const before = value.slice(0, lastAtIndex);
    const after = value.slice(cursorPos);
    const newValue = `${before}@${user.full_name} ${after}`;
    onChange(newValue);
    setMentionOpen(false);
    if (onMention) onMention(user.id);
  };

  return (
    <div className="relative flex-1">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={(e) => setCursorPos((e.target as HTMLTextAreaElement).selectionStart)}
        onClick={(e) => setCursorPos((e.target as HTMLTextAreaElement).selectionStart)}
        placeholder={placeholder || 'Escribe un comentario... Usa @ para mencionar'}
        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 outline-none resize-none min-h-[44px] focus:border-blue-300 focus:bg-white transition-all"
        rows={2}
      />
      {mentionOpen && filtered.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 shadow-xl z-50 max-h-40 overflow-y-auto">
          {filtered.map(u => (
            <button
              key={u.id}
              type="button"
              className="w-full text-left px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#002855] border-b border-slate-100 last:border-0 transition-colors"
              onClick={() => insertMention(u)}
            >
              @{u.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
