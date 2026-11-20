import { buildAvatarSVG } from '../lib/avatar-svg';

interface Props {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-32 h-32 mb-6 relative">
        <svg viewBox="0 0 300 300" className="w-full h-full" aria-hidden="true">
          <g dangerouslySetInnerHTML={{ __html: buildAvatarSVG({ character: 'panda', accessories: [] }) }} />
        </svg>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">
          💤
        </div>
      </div>
      <h3 className="font-display font-bold text-lg text-navy mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-6 max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-navy text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-navy/90 transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
