
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ClickableItem, HandData } from './types';
import { useHandTracking } from './hooks/useHandTracking';
import { getFunFact } from './services/geminiService';
import { ClickableCard } from './components/ClickableCard';
import { InfoModal } from './components/InfoModal';
import { VisionCursor } from './components/VisionCursor';
import { LoadingSpinner, CameraIcon } from './components/Icons';

const INTERACTIVE_ITEMS: ClickableItem[] = [
  { id: 'earth', title: 'Planet Earth', image: 'https://picsum.photos/seed/earth/400/600' },
  { id: 'saturn', title: 'Saturn', image: 'https://picsum.photos/seed/saturn/400/600' },
  { id: 'galaxy', title: 'A Distant Galaxy', image: 'https://picsum.photos/seed/galaxy/400/600' },
];

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [handData, setHandData] = useState<HandData | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const wasPinchingRef = useRef(false);

  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ClickableItem | null>(null);
  const [modalContent, setModalContent] = useState<string>('');
  const [isModalLoading, setIsModalLoading] = useState(false);

  const onHandData = useCallback((data: HandData) => {
    setHandData(data);
    setIsPinching(data.isPinching);
  }, []);
  
  const { isReady: isHandTrackingReady, error: handTrackingError } = useHandTracking(videoRef, onHandData);

  useEffect(() => {
    if (isHandTrackingReady && !handTrackingError) {
      setTimeout(() => setIsAppReady(true), 1000); // Give a moment for aesthetics
    }
  }, [isHandTrackingReady, handTrackingError]);

  const handleItemClick = useCallback(async (item: ClickableItem) => {
    if (selectedItem?.id === item.id || isModalLoading) return;

    setSelectedItem(item);
    setIsModalLoading(true);
    setModalContent('');
    try {
      const fact = await getFunFact(item.title);
      setModalContent(fact);
    } catch (err) {
      console.error(err);
      setModalContent('Could not retrieve information at this time.');
    } finally {
      setIsModalLoading(false);
    }
  }, [selectedItem, isModalLoading]);

  useEffect(() => {
    if (!handData) return;

    const { x, y } = handData.cursor;
    const element = document.elementFromPoint(x, y);
    const card = element?.closest('[data-clickable-id]');
    const cardId = card?.getAttribute('data-clickable-id') ?? null;
    
    setHoveredItemId(cardId);
    
    const justPinched = isPinching && !wasPinchingRef.current;
    
    if (justPinched && cardId) {
      const itemToClick = INTERACTIVE_ITEMS.find(item => item.id === cardId);
      if (itemToClick) {
        handleItemClick(itemToClick);
      }
    }

    wasPinchingRef.current = isPinching;
  }, [handData, isPinching, handleItemClick]);

  const closeModal = () => {
    setSelectedItem(null);
    setModalContent('');
  };

  return (
    <main className="relative h-screen w-screen bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden select-none font-sans">
      {/* Video element for MediaPipe, visually hidden */}
      <video ref={videoRef} className="absolute w-px h-px -left-full -top-full" playsInline />
      
      {/* Loading/Error Overlay */}
      {!isAppReady && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          {handTrackingError ? (
             <div className="text-center text-red-400">
                <p className="text-xl font-bold">Error Initializing Hand Tracking</p>
                <p className="mt-2 text-sm max-w-sm">{handTrackingError}</p>
             </div>
          ) : (
            <div className="text-center">
              <LoadingSpinner className="w-12 h-12 text-blue-400" />
              <p className="mt-4 text-lg animate-pulse">Initializing Vision System...</p>
              <p className="text-sm text-gray-400">Please allow camera access.</p>
            </div>
          )}
        </div>
      )}

      {/* Main UI */}
      <div className={`transition-opacity duration-1000 ${isAppReady ? 'opacity-100' : 'opacity-0'}`}>
        <header className="absolute top-0 left-0 right-0 p-6 z-20">
          <h1 className="text-2xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Vision Pinch Control
          </h1>
          <p className="text-gray-400 text-sm mt-1">Point with your index finger and pinch to select an object.</p>
        </header>

        <div className="absolute inset-0 flex items-center justify-center gap-12 pt-20 z-10">
          {INTERACTIVE_ITEMS.map(item => (
            <ClickableCard 
              key={item.id}
              item={item}
              isHovered={hoveredItemId === item.id}
              isSelected={selectedItem?.id === item.id}
              onClick={() => handleItemClick(item)}
            />
          ))}
        </div>

        <InfoModal
          isOpen={!!selectedItem}
          onClose={closeModal}
          item={selectedItem}
          content={modalContent}
          isLoading={isModalLoading}
        />
        
        {handData && (
          <VisionCursor 
            x={handData.cursor.x} 
            y={handData.cursor.y} 
            isPinching={isPinching} 
          />
        )}
      </div>

      <div className="absolute bottom-4 right-4 flex items-center space-x-2 text-xs text-gray-500 z-20">
        <CameraIcon className="w-4 h-4" />
        <span>Hand Tracking Active</span>
      </div>
    </main>
  );
}
