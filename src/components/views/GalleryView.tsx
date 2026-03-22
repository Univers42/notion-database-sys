import React from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { Plus, Image, MoreHorizontal, ArrowUpRight } from 'lucide-react';
import { CURSORS } from '../ui/cursors';
import { format } from 'date-fns';

export function GalleryView() {
  const { activeViewId, views, databases, getPagesForView, openPage, getPageTitle, addPage } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  if (!view || !database) return null;

  const settings = view.settings || {};
  const cardSize = settings.cardSize || 'medium';
  const fitMedia = settings.fitMedia !== false;
  const showPageIcon = settings.showPageIcon !== false;
  const wrapContent = settings.wrapContent === true;
  const cardPreview = settings.cardPreview || 'none';

  const pages = getPagesForView(view.id);
  const visibleProps = view.visibleProperties.map(id => database.properties[id]).filter(Boolean);
  const nonTitleProps = visibleProps.filter(p => p.id !== database.titlePropertyId);

  const gridCols = cardSize === 'small' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
    : cardSize === 'large' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : cardSize === 'xl' ? 'grid-cols-1 sm:grid-cols-2'
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  const coverHeight = cardSize === 'small' ? 'h-24' : cardSize === 'large' ? 'h-48' : cardSize === 'xl' ? 'h-56' : 'h-36';

  const renderPropertyValue = (prop: any, val: any) => {
    if (val === undefined || val === null || val === '') return null;
    if (prop.type === 'select' || prop.type === 'status') {
      const opt = prop.options?.find((o: any) => o.id === val);
      return opt ? <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span> : null;
    }
    if (prop.type === 'multi_select') {
      const ids: string[] = Array.isArray(val) ? val : [];
      return (
        <div className={`flex gap-1 ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
          {ids.map(id => {
            const opt = prop.options?.find((o: any) => o.id === id);
            return opt ? <span key={id} className={`px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span> : null;
          })}
        </div>
      );
    }
    if (prop.type === 'date') return <span className="text-xs text-gray-500">{format(new Date(val), 'MMM d, yyyy')}</span>;
    if (prop.type === 'checkbox') {
      return (
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${val ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
          {val && <span className="text-white text-[10px]">✓</span>}
        </div>
      );
    }
    if (prop.type === 'number') return <span className="text-xs text-gray-500 tabular-nums">{Number(val).toLocaleString()}</span>;
    if (prop.type === 'user' || prop.type === 'person') {
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
            {String(val).charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-gray-600 truncate">{val}</span>
        </div>
      );
    }
    if (prop.type === 'url') return <a href={val} className={`text-xs text-blue-500 hover:underline ${wrapContent ? 'break-all' : 'truncate'}`} onClick={e => e.stopPropagation()}>{val}</a>;
    return <span className={`text-xs text-gray-700 ${wrapContent ? 'break-words' : 'truncate'}`}>{String(val)}</span>;
  };

  // Gallery-specific color palette for empty covers
  const coverColors = [
    'bg-gradient-to-br from-blue-100 to-blue-50',
    'bg-gradient-to-br from-purple-100 to-purple-50',
    'bg-gradient-to-br from-green-100 to-green-50',
    'bg-gradient-to-br from-orange-100 to-orange-50',
    'bg-gradient-to-br from-pink-100 to-pink-50',
    'bg-gradient-to-br from-cyan-100 to-cyan-50',
  ];

  // Render cover based on cardPreview setting
  const renderCover = (page: any, idx: number) => {
    const coverColor = coverColors[idx % coverColors.length];

    if (cardPreview === 'none') {
      // No cover area at all
      return null;
    }

    if (cardPreview === 'page_cover') {
      // Show page cover image, icon, or colored placeholder
      return (
        <div className={`${coverHeight} ${coverColor} relative flex items-center justify-center`}>
          {page.cover ? (
            <img src={page.cover} alt="" className={`w-full h-full ${fitMedia ? 'object-cover' : 'object-contain'}`} />
          ) : page.icon ? (
            <span className="text-4xl">{page.icon}</span>
          ) : (
            <Image className="w-8 h-8 text-gray-300" />
          )}
          <button className="absolute top-2 right-2 p-1 rounded bg-white/80 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            onClick={(e) => { e.stopPropagation(); }}>
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      );
    }

    if (cardPreview === 'page_content') {
      // Show a preview of the page's block content
      const textContent = page.content?.map((b: any) => b.content).filter(Boolean).join(' ') || '';
      return (
        <div className={`${coverHeight} ${coverColor} relative p-3 overflow-hidden`}>
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-5">{textContent || 'No content'}</p>
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/80 to-transparent" />
          <button className="absolute top-2 right-2 p-1 rounded bg-white/80 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            onClick={(e) => { e.stopPropagation(); }}>
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      );
    }

    if (cardPreview === 'page_properties') {
      // Show a compact property overview in the cover area
      return (
        <div className={`${coverHeight} bg-gray-50 relative p-3 overflow-hidden flex flex-col gap-1.5`}>
          {nonTitleProps.slice(0, 6).map(prop => {
            const val = page.properties[prop.id];
            const rendered = renderPropertyValue(prop, val);
            if (!rendered) return null;
            return (
              <div key={prop.id} className="flex items-center gap-2">
                <span className="text-[10px] uppercase text-gray-400 tracking-wide shrink-0 w-14 truncate">{prop.name}</span>
                {rendered}
              </div>
            );
          })}
          <button className="absolute top-2 right-2 p-1 rounded bg-white/80 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            onClick={(e) => { e.stopPropagation(); }}>
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 overflow-auto p-6 bg-white">
      <div className={`grid ${gridCols} gap-4`}>
        {pages.map((page, idx) => {
          const title = getPageTitle(page);

          return (
            <div key={page.id} onClick={() => openPage(page.id)}
              style={{ cursor: CURSORS.pointer }}
              className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200 bg-white">
              {/* Cover / Preview */}
              {renderCover(page, idx)}

              {/* Content */}
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  {showPageIcon && page.icon && <span className="text-sm">{page.icon}</span>}
                  <span className={`font-semibold text-sm text-gray-900 ${wrapContent ? 'break-words' : 'truncate'} flex-1 min-w-0`}>{title || <span className="text-gray-400">Untitled</span>}</span>
                  <button
                    className="shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-blue-500 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); openPage(page.id); }}>
                    <ArrowUpRight className="w-3 h-3" /> Open
                  </button>
                </div>
                {/* Only show property rows when preview is NOT page_properties (avoid duplication) */}
                {cardPreview !== 'page_properties' && nonTitleProps.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2">
                    {nonTitleProps.slice(0, 4).map(prop => {
                      const val = page.properties[prop.id];
                      const rendered = renderPropertyValue(prop, val);
                      if (!rendered) return null;
                      return (
                        <div key={prop.id} className="flex items-center gap-2">
                          <span className="text-[10px] uppercase text-gray-400 tracking-wide shrink-0 w-16 truncate">{prop.name}</span>
                          {rendered}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add card */}
        <div onClick={() => addPage(database.id)}
          className="border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
          style={{ cursor: CURSORS.pointer, minHeight: cardSize === 'small' ? '120px' : cardSize === 'large' ? '240px' : '180px' }}>
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <Plus className="w-6 h-6" />
            <span className="text-sm">New page</span>
          </div>
        </div>
      </div>

      {pages.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Image className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No pages to display</p>
        </div>
      )}
    </div>
  );
}
