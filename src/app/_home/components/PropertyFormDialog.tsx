"use client";

import type { CSSProperties, ChangeEvent, FormEvent } from "react";
import { Camera, Check, Home, Info, Mountain, Pencil, Plus, X } from "lucide-react";

import { criteriaByType } from "../property-options";
import { formatCoordinates, getCriterionColor } from "../property-utils";
import type {
  AddressLookupState,
  Coordinates,
  PropertyFormState,
  PropertyStatus,
  PropertyType,
} from "../types";
import { RatingPill } from "./RatingPill";

type PropertyFormDialogProps = {
  addressLookup: AddressLookupState;
  addressVerified: boolean;
  form: PropertyFormState;
  formError: string;
  isEditing: boolean;
  manualCoordinates: Coordinates | null;
  onAddPhotos: (event: ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onCriterionScoreChange: (label: string, score: string) => void;
  onFormChange: <Key extends keyof PropertyFormState>(
    key: Key,
    value: PropertyFormState[Key],
  ) => void;
  onPropertyTypeChange: (type: PropertyType) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  rating: number;
};

export function PropertyFormDialog({
  addressLookup,
  addressVerified,
  form,
  formError,
  isEditing,
  manualCoordinates,
  onAddPhotos,
  onClose,
  onCriterionScoreChange,
  onFormChange,
  onPropertyTypeChange,
  onSubmit,
  rating,
}: PropertyFormDialogProps) {
  return (
    <div className="details-backdrop" role="presentation">
      <section className="details-panel" aria-labelledby="add-property-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              {isEditing ? "Edycja nieruchomości" : "Nowa nieruchomość"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold" id="add-property-title">
              {isEditing ? "Popraw dane wpisu" : "Dodaj punkt na mapie"}
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Zamknij dodawanie nieruchomości"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <form className="property-form" onSubmit={onSubmit}>
          <div className="form-field">
            <span>Typ</span>
            <div className="segmented-control">
              <button
                aria-pressed={form.type === "land"}
                onClick={() => onPropertyTypeChange("land")}
                type="button"
              >
                <Mountain aria-hidden="true" className="size-4" />
                ZIEMIA
              </button>
              <button
                aria-pressed={form.type === "house"}
                onClick={() => onPropertyTypeChange("house")}
                type="button"
              >
                <Home aria-hidden="true" className="size-4" />
                DOM
              </button>
            </div>
          </div>

          <label className="form-field">
            <span>Nazwa</span>
            <input
              value={form.title}
              onChange={(event) => onFormChange("title", event.target.value)}
              placeholder="np. Działka przy parku"
              required
            />
          </label>

          <label className="form-field">
            <span className="field-label-with-help">
              Lokalizacja
              <span className="info-popover">
                <button
                  aria-describedby="location-help"
                  aria-label="Jak zapisywana jest lokalizacja"
                  className="info-popover__trigger"
                  type="button"
                >
                  <Info aria-hidden="true" className="size-3.5" />
                </button>
                <span className="info-popover__content" id="location-help" role="tooltip">
                  {manualCoordinates
                    ? "Ten wpis zostanie zapisany w punkcie wskazanym długim przytrzymaniem na mapie."
                    : "Adres zostanie sprawdzony przez geokodowanie OpenStreetMap/Nominatim i zapisany jako współrzędne na mapie."}
                </span>
              </span>
            </span>
            <span className="address-input-wrap" data-verified={addressVerified}>
              <input
                value={form.location}
                onChange={(event) => onFormChange("location", event.target.value)}
                placeholder="np. Legionów Polskich, Dąbrowa Górnicza"
                required
              />
              {addressVerified ? (
                <span
                  aria-label="Adres odnaleziony na mapie"
                  className="address-check"
                  role="img"
                  title="Adres odnaleziony na mapie"
                >
                  <Check aria-hidden="true" className="size-4" />
                </span>
              ) : null}
            </span>
            {manualCoordinates ? (
              <span className="address-lookup" data-state="pinned">
                Punkt wskazany na mapie: {formatCoordinates(manualCoordinates)}
              </span>
            ) : null}
            {addressLookup.status !== "idle" &&
            !manualCoordinates &&
            addressLookup.status !== "found" &&
            addressLookup.query === form.location.trim() ? (
              <span className="address-lookup" data-state={addressLookup.status}>
                {addressLookup.message}
              </span>
            ) : null}
          </label>

          <div className="form-grid">
            <label className="form-field">
              <span className="field-label-with-help">
                Cena (tyś)
                <span className="info-popover">
                  <button
                    aria-describedby="price-help"
                    aria-label="Jak wpisywać cenę"
                    className="info-popover__trigger"
                    type="button"
                  >
                    <Info aria-hidden="true" className="size-3.5" />
                  </button>
                  <span className="info-popover__content" id="price-help" role="tooltip">
                    Wpisz kwotę w tysiącach, np. 425 = 425 tys. zł.
                  </span>
                </span>
              </span>
              <input
                value={form.price}
                onChange={(event) => onFormChange("price", event.target.value)}
                placeholder="425"
                required
              />
            </label>
            <label className="form-field">
              <span>Powierzchnia</span>
              <input
                value={form.area}
                onChange={(event) => onFormChange("area", event.target.value)}
                placeholder="1 100 m²"
                required
              />
            </label>
          </div>

          <label className="form-field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                onFormChange("status", event.target.value as PropertyStatus)
              }
            >
              <option>Do obejrzenia</option>
              <option>Obiecujące</option>
              <option>W trakcie</option>
              <option>Odrzucone</option>
            </select>
          </label>

          <div className="criteria-editor">
            <div>
              <h3>Kryteria oceny</h3>
              <p>Ocena końcowa liczy się automatycznie jako średnia.</p>
            </div>
            {criteriaByType[form.type].map((criterion) => {
              const criterionScore = Number(form.criteriaScores[criterion] ?? "7");

              return (
                <label
                  className="criterion-input"
                  key={criterion}
                  style={{
                    "--criterion-color": getCriterionColor(criterionScore),
                  } as CSSProperties}
                >
                  <span>{criterion}</span>
                  <input
                    max="10"
                    min="1"
                    step="1"
                    type="range"
                    value={form.criteriaScores[criterion] ?? "7"}
                    onChange={(event) =>
                      onCriterionScoreChange(criterion, event.target.value)
                    }
                  />
                  <strong>{form.criteriaScores[criterion] ?? "7"}/10</strong>
                </label>
              );
            })}
            <div className="criterion-average-tile">
              <span>Średnia ocena</span>
              <RatingPill rating={rating} />
            </div>
          </div>

          <div className="photo-uploader">
            <div>
              <h3 className="field-label-with-help">
                Zdjęcia
                <span className="info-popover">
                  <button
                    aria-describedby="photos-help"
                    aria-label="Jak przechowywane są zdjęcia"
                    className="info-popover__trigger"
                    type="button"
                  >
                    <Info aria-hidden="true" className="size-3.5" />
                  </button>
                  <span className="info-popover__content" id="photos-help" role="tooltip">
                    Nowe zdjęcia trafiają do prywatnego Supabase Storage i są dostępne tylko dla członków aktywnego projektu.
                  </span>
                </span>
              </h3>
              <p>Możesz dodać jedno zdjęcie albo od razu całą serię.</p>
            </div>
            <div className="photo-actions">
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

            {form.photos.length > 0 ? (
              <div className="photo-grid">
                {form.photos.map((photo) => (
                  <figure className="photo-thumb" key={photo.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.name} />
                  </figure>
                ))}
              </div>
            ) : null}
          </div>

          <label className="form-field">
            <span>Opis</span>
            <textarea
              value={form.description}
              onChange={(event) => onFormChange("description", event.target.value)}
              placeholder="Krótka notatka, co warto sprawdzić..."
              rows={4}
            />
          </label>

          <label className="form-field">
            <span>Link zewnętrzny</span>
            <input
              value={form.sourceUrl}
              onChange={(event) => onFormChange("sourceUrl", event.target.value)}
              placeholder="np. https://www.otodom.pl/..."
              type="url"
            />
          </label>

          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="form-actions">
            <button className="secondary-button justify-center" onClick={onClose} type="button">
              Anuluj
            </button>
            <button className="primary-button justify-center" type="submit">
              {isEditing ? (
                <Pencil aria-hidden="true" className="size-4" />
              ) : (
                <Plus aria-hidden="true" className="size-4" />
              )}
              {isEditing ? "Zapisz zmiany" : "Zapisz"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
