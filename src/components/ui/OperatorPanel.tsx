import React, { useState, useEffect } from 'react';

interface OperatorPanelProps {
  username: string;
  userId: string;
  onRename: (newName: string) => void;
}

export const OperatorPanel: React.FC<OperatorPanelProps> = ({
  username,
  userId,
  onRename,
}) => {
  const [localName, setLocalName] = useState(username);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    setLocalName(username);
  }, [username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localName.trim() && localName.trim().length <= 15) {
      onRename(localName.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div className="w-full flex flex-col font-mono text-white pointer-events-auto">
      {/* Profile Section */}
      <div className="mb-6 border-b border-neutral-800 pb-5">
        <h3 className="text-xs font-bold tracking-widest text-neutral-500 uppercase mb-2">OPERATOR</h3>
        {isEditingName ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              maxLength={15}
              className="bg-neutral-900 border border-neutral-700 text-white text-xs px-2 py-1 flex-1 font-mono focus:outline-none focus:border-yellow-500"
              autoFocus
            />
            <button 
              type="submit" 
              className="bg-yellow-500 text-black px-3 py-1 text-xs font-bold font-mono hover:bg-yellow-400"
            >
              OK
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-yellow-500 truncate max-w-[150px]">{username}</span>
            <button 
              onClick={() => setIsEditingName(true)}
              className="text-[10px] text-neutral-400 hover:text-white underline border-none bg-none p-0 cursor-pointer"
            >
              [Renombrar]
            </button>
          </div>
        )}
        <div className="text-[9px] text-neutral-500 mt-1 uppercase">ID: {userId}</div>
      </div>
    </div>
  );
};
