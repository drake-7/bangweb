import { ReactNode, useEffect, useRef, useState } from "react";
import "./Style/UserMenu.css"
import getLabel from "../Locale/GetLabel";

export interface UserMenuItemProps {
  onClick: () => void;
  children: ReactNode;
}

export function UserMenuItem({ onClick, children }: UserMenuItemProps) {
  return <li><a href="#" onClick={onClick} className="block px-4 py-2 text-sm hover:bg-gray-600 text-gray-200 hover:text-white">{children}</a></li>;
}

export interface UserMenuProps {
  username?: string;
  setUsername: (value: string) => void;
  children: ReactNode;
}

export default function UserMenu({ username, setUsername, children }: UserMenuProps) {
  const usernameRef = useRef<HTMLInputElement>(null);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    if (showInput) {
      usernameRef.current?.focus();
    }
  }, [showInput]);

  return (
    <div className='user-menu z-50
    absolute top-10 right-0
    text-base list-none divide-y rounded-lg shadow bg-gray-700 divide-gray-600'
    >
      <div className="px-4 py-3">
        <div className={showInput ? 'username-input' : 'username-span'}
          onClick={() => setShowInput(true)}>
          <span className="block text-sm text-white">{username || getLabel('ui', 'UNKNOWN_PLAYER')}</span>
          <input ref={usernameRef} value={username}
            onChange={e => setUsername(e.target.value)}
            onBlur={() => setShowInput(false)}
          />
        </div>
      </div>
      <ul className="py-2" aria-labelledby="user-menu-button">{children}</ul>
    </div>
  )
}