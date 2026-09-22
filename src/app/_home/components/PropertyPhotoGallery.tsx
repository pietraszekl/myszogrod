import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Property } from "../types";
import { TypeIcon } from "./TypeIcon";

export function PropertyPhotoGallery({
  activeIndex,
  onActiveIndexChange,
  property,
}: {
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  property: Property;
}) {
  const photos = property.photos;
  const activePhoto = photos[activeIndex] ?? photos[0];
  const hasMultiplePhotos = photos.length > 1;

  if (!activePhoto) {
    return (
      <div className="details-photo">
        <TypeIcon type={property.type} className="size-10" />
      </div>
    );
  }

  function showPreviousPhoto() {
    onActiveIndexChange((activeIndex - 1 + photos.length) % photos.length);
  }

  function showNextPhoto() {
    onActiveIndexChange((activeIndex + 1) % photos.length);
  }

  return (
    <div className="property-gallery">
      <div className="details-photo property-gallery__hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activePhoto.url}
          alt={`Zdjęcie ${activeIndex + 1}: ${activePhoto.name}`}
        />
        {hasMultiplePhotos ? (
          <>
            <button
              aria-label="Poprzednie zdjęcie"
              className="gallery-nav gallery-nav--prev"
              onClick={showPreviousPhoto}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              aria-label="Następne zdjęcie"
              className="gallery-nav gallery-nav--next"
              onClick={showNextPhoto}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
            <span className="gallery-counter">
              {activeIndex + 1} / {photos.length}
            </span>
          </>
        ) : null}
      </div>

      {hasMultiplePhotos ? (
        <div className="gallery-strip" aria-label="Miniatury zdjęć">
          {photos.map((photo, index) => (
            <button
              aria-label={`Pokaż zdjęcie ${index + 1}`}
              aria-pressed={index === activeIndex}
              className="gallery-thumb"
              key={photo.id}
              onClick={() => onActiveIndexChange(index)}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
