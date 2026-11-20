import { buildAvatarSVG } from '../lib/avatar-svg';

export default function LoadingState({ message = 'Memuat...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-20 h-20 mb-4 animate-bounce">
        <svg viewBox="0 0 300 300" className="w-full h-full" aria-hidden="true">
          <g dangerouslySetInnerHTML={{ __html: buildAvatarSVG({ character: 'panda', accessories: [] }) }} />
        </svg>
      </div>
      <p className="text-sm text-gray-400 font-medium">{message}</p>
    </div>
  );
}
