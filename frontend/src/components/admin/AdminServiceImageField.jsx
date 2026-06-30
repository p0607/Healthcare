import { ImagePlus, X } from 'lucide-react';

export default function AdminServiceImageField({ imageUrl, onUpload, onRemove, compact }) {
  return (
    <div className={compact ? 'mt-2' : 'mt-3'}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-1.5">Picture</p>
      <div className="flex flex-wrap items-start gap-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className={`rounded-lg border border-glass-border/60 object-cover bg-glass/30 ${
              compact ? 'h-14 w-14' : 'h-20 w-20'
            }`}
          />
        ) : (
          <span
            className={`flex items-center justify-center rounded-lg border border-dashed border-glass-border/70 bg-glass/20 text-muted ${
              compact ? 'h-14 w-14' : 'h-20 w-20'
            }`}
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
          </span>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="btn-outline !py-1.5 !px-3 text-xs cursor-pointer w-fit">
            {imageUrl ? 'Change image' : 'Upload image'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) onUpload(file);
              }}
            />
          </label>
          {imageUrl && onRemove && (
            <button type="button" className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1" onClick={onRemove}>
              <X className="h-3.5 w-3.5" aria-hidden />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
