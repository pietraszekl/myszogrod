"use client";

import type { CSSProperties, ChangeEvent } from "react";
import { Camera, Pencil, Trash2, X } from "lucide-react";

import { formatPrice, getCriterionColor } from "../property-utils";
import type { Property } from "../types";
import { PropertyPhotoGallery } from "./PropertyPhotoGallery";
import { RatingPill } from "./RatingPill";

type PropertyDetailsPanelProps = {
  activePhotoIndex: number;
  deleteActionError: string;
  mode: "sidebar" | "dialog";
  onAddPhotos: (event: ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onDelete: () => void;
  onEdit: (property: Property) => void;
  onPhotoIndexChange: (index: number) => void;
  photoActionError: string;
  property: Property;
  rating: number;
};

export function PropertyDetailsPanel({
  activePhotoIndex,
  deleteActionError,
  mode,
  onAddPhotos,
  onClose,
  onDelete,
  onEdit,
  onPhotoIndexChange,
  photoActionError,
  property,
  rating,
}: PropertyDetailsPanelProps) {
  const isDialog = mode === "dialog";
  const panelClassName = isDialog ? "details-panel" : "sidebar-detail-panel pointer-events-auto";
  const titleId = isDialog ? "property-details-title" : undefined;

  const content = (
    <section className={panelClassName} aria-labelledby={titleId}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
            {isDialog ? "Szczegóły nieruchomości" : "Szczegóły lokalizacji"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold" id={titleId}>
            {property.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {property.location}
          </p>
        </div>
        <button
          className="icon-button"
          aria-label={isDialog ? "Zamknij szczegóły" : "Wróć do listy nieruchomości"}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className={isDialog ? "mt-5" : "mt-5 sidebar-detail-photo"}>
        <PropertyPhotoGallery
          activeIndex={activePhotoIndex}
          onActiveIndexChange={onPhotoIndexChange}
          property={property}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="metric-tile">
          <span>Status</span>
          <strong>{property.status}</strong>
        </div>
        <div className="metric-tile">
          <span>Cena</span>
          <strong>{formatPrice(property.price)}</strong>
        </div>
        <div className="metric-tile">
          <span>Powierzchnia</span>
          <strong>{property.area}</strong>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-[var(--color-muted)]">
        {property.description}
      </p>
      {property.sourceUrl ? (
        <a
          className="external-link mt-4"
          href={property.sourceUrl}
          rel="noreferrer"
          target="_blank"
        >
          Otwórz ogłoszenie zewnętrzne
        </a>
      ) : null}

      <div className="mt-6">
        <h3 className="text-sm font-semibold">Kryteria oceny</h3>
        <div className="mt-3 space-y-3">
          {property.criteria.map((criterion) => (
            <div
              className="criterion-row"
              key={criterion.label}
              style={{
                "--criterion-color": getCriterionColor(criterion.score),
              } as CSSProperties}
            >
              <span>{criterion.label}</span>
              <div className="criterion-bar" aria-hidden="true">
                <span style={{ width: `${criterion.score * 10}%` }} />
              </div>
              <strong>{criterion.score}/10</strong>
            </div>
          ))}
        </div>
        <div className="criterion-average-tile">
          <span>Średnia ocena</span>
          <RatingPill rating={rating} />
        </div>
      </div>

      {isDialog ? (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Zdjęcia</h3>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {property.photos.length} zdjęć przy tej nieruchomości
              </p>
            </div>
          </div>

          <div className="photo-actions mt-3">
            <label className="secondary-button justify-center">
              <Camera aria-hidden="true" className="size-4" />
              Dodaj serię
              <input accept="image/*" multiple onChange={onAddPhotos} type="file" />
            </label>
            <label className="secondary-button justify-center">
              <Camera aria-hidden="true" className="size-4" />
              Aparat
              <input
                accept="image/*"
                capture="environment"
                onChange={onAddPhotos}
                type="file"
              />
            </label>
          </div>

          {photoActionError ? (
            <p className="form-error mt-3" role="alert">
              {photoActionError}
            </p>
          ) : null}

          {property.photos.length > 0 ? (
            <div className="photo-grid mt-3">
              {property.photos.map((photo) => (
                <figure className="photo-thumb" key={photo.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.name} />
                </figure>
              ))}
            </div>
          ) : (
            <div className="empty-state mt-3">
              <Camera aria-hidden="true" className="size-5" />
              <p>Dodaj zdjęcia z telefonu, aparatu albo komputera.</p>
            </div>
          )}
        </div>
      ) : null}

      <div className={isDialog ? "mt-6 flex gap-2" : "mt-6 grid grid-cols-3 gap-2"}>
        <button
          className={isDialog ? "secondary-button flex-1 justify-center" : "secondary-button justify-center"}
          onClick={() => onEdit(property)}
          type="button"
        >
          <Pencil aria-hidden="true" className="size-4" />
          Edytuj
        </button>
        {!isDialog ? (
          <label className="secondary-button justify-center">
            <Camera aria-hidden="true" className="size-4" />
            Zdjęcia
            <input accept="image/*" multiple onChange={onAddPhotos} type="file" />
          </label>
        ) : null}
        <button
          className={isDialog ? "danger-button flex-1 justify-center" : "danger-button justify-center"}
          onClick={onDelete}
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Usuń
        </button>
      </div>
      {(!isDialog && (photoActionError || deleteActionError)) || (isDialog && deleteActionError) ? (
        <p className="form-error mt-3" role="alert">
          {isDialog ? deleteActionError : photoActionError || deleteActionError}
        </p>
      ) : null}
    </section>
  );

  if (isDialog) {
    return (
      <div className="details-backdrop" role="presentation">
        {content}
      </div>
    );
  }

  return (
    <aside className="pointer-events-none absolute bottom-0 left-0 top-0 z-20 hidden w-[410px] p-6 lg:block">
      {content}
    </aside>
  );
}
