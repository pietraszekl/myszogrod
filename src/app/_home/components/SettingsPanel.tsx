"use client";

import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { KeyRound, LogIn, LogOut, Trash2, UserPlus, X } from "lucide-react";

import type { AuthMode, ProjectInvitation } from "../types";

type SettingsPanelProps = {
  accountActionBusy: boolean;
  authBusy: boolean;
  authEmail: string;
  authMessage: string;
  authMode: AuthMode;
  authPassword: string;
  currentUser: User | null;
  inviteEmail: string;
  inviteInstructions: string;
  newAuthPassword: string;
  onAuthEmailChange: (email: string) => void;
  onAuthModeChange: (mode: AuthMode) => void;
  onAuthPasswordChange: (password: string) => void;
  onClose: () => void;
  onCopyInviteInstructions: () => void;
  onDeleteOwnAccount: () => void;
  onEmailPasswordAuth: (event: FormEvent<HTMLFormElement>) => void;
  onInviteCollaborator: (event: FormEvent<HTMLFormElement>) => void;
  onInviteEmailChange: (email: string) => void;
  onNewAuthPasswordChange: (password: string) => void;
  onPasswordReset: () => void;
  onRecoveredPasswordUpdate: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
  onAuthMessageClear: () => void;
  passwordRecoveryOpen: boolean;
  projectInvitations: ProjectInvitation[];
  settingsError: string;
  canInvite: boolean;
};

export function SettingsPanel({
  accountActionBusy,
  authBusy,
  authEmail,
  authMessage,
  authMode,
  authPassword,
  currentUser,
  inviteEmail,
  inviteInstructions,
  newAuthPassword,
  onAuthEmailChange,
  onAuthMessageClear,
  onAuthModeChange,
  onAuthPasswordChange,
  onClose,
  onCopyInviteInstructions,
  onDeleteOwnAccount,
  onEmailPasswordAuth,
  onInviteCollaborator,
  onInviteEmailChange,
  onNewAuthPasswordChange,
  onPasswordReset,
  onRecoveredPasswordUpdate,
  onSignOut,
  passwordRecoveryOpen,
  projectInvitations,
  settingsError,
  canInvite,
}: SettingsPanelProps) {
  return (
    <div className="details-backdrop" role="presentation">
      <section className="details-panel" aria-labelledby="settings-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Bezpieczeństwo i współpraca
            </p>
            <h2 className="mt-2 text-2xl font-semibold" id="settings-title">
              Ustawienia projektu
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Zamknij ustawienia"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        {passwordRecoveryOpen ? (
          <div className="property-form">
            <form className="auth-form" onSubmit={onRecoveredPasswordUpdate}>
              <label className="form-field">
                <span>Nowe hasło</span>
                <input
                  autoComplete="new-password"
                  value={newAuthPassword}
                  onChange={(event) => onNewAuthPasswordChange(event.target.value)}
                  placeholder="Minimum 6 znaków"
                  type="password"
                />
              </label>
              <button
                className="primary-button justify-center"
                disabled={authBusy}
                type="submit"
              >
                <KeyRound aria-hidden="true" className="size-4" />
                {authBusy ? "Zapisuję..." : "Zapisz nowe hasło"}
              </button>
            </form>

            {authMessage ? (
              <p className="form-help" role="status">
                {authMessage}
              </p>
            ) : null}
          </div>
        ) : !currentUser ? (
          <div className="property-form">
            <div className="auth-mode-toggle" aria-label="Tryb logowania">
              <button
                data-active={authMode === "sign-in"}
                onClick={() => {
                  onAuthModeChange("sign-in");
                  onAuthMessageClear();
                }}
                type="button"
              >
                Logowanie
              </button>
              <button
                data-active={authMode === "sign-up"}
                onClick={() => {
                  onAuthModeChange("sign-up");
                  onAuthMessageClear();
                }}
                type="button"
              >
                Rejestracja
              </button>
            </div>

            <form className="auth-form" onSubmit={onEmailPasswordAuth}>
              <label className="form-field">
                <span>Email</span>
                <input
                  autoComplete="email"
                  value={authEmail}
                  onChange={(event) => onAuthEmailChange(event.target.value)}
                  placeholder="email@przyklad.pl"
                  type="email"
                />
              </label>
              <label className="form-field">
                <span>Hasło</span>
                <input
                  autoComplete={authMode === "sign-up" ? "new-password" : "current-password"}
                  value={authPassword}
                  onChange={(event) => onAuthPasswordChange(event.target.value)}
                  placeholder="Minimum 6 znaków"
                  type="password"
                />
              </label>
              <button className="primary-button justify-center" disabled={authBusy} type="submit">
                {authMode === "sign-up" ? (
                  <KeyRound aria-hidden="true" className="size-4" />
                ) : (
                  <LogIn aria-hidden="true" className="size-4" />
                )}
                {authBusy
                  ? authMode === "sign-up"
                    ? "Tworzę konto..."
                    : "Loguję..."
                  : authMode === "sign-up"
                    ? "Utwórz konto"
                    : "Zaloguj"}
              </button>
            </form>

            {authMode === "sign-in" ? (
              <button
                className="auth-link-button"
                disabled={authBusy}
                onClick={onPasswordReset}
                type="button"
              >
                Nie pamiętasz hasła?
              </button>
            ) : null}

            {authMessage ? (
              <p className="form-help" role="status">
                {authMessage}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="property-form">
            <form className="settings-inline-form" onSubmit={onInviteCollaborator}>
              <label className="form-field">
                <span>Zaproszenie</span>
                <input
                  value={inviteEmail}
                  onChange={(event) => onInviteEmailChange(event.target.value)}
                  placeholder="email@przyklad.pl"
                  type="email"
                />
              </label>
              <button
                className="secondary-button justify-center"
                disabled={!canInvite}
                type="submit"
              >
                <UserPlus aria-hidden="true" className="size-4" />
                Zaproś
              </button>
            </form>

            {inviteInstructions ? (
              <div className="invite-instructions">
                <p>{inviteInstructions}</p>
                <button
                  className="secondary-button justify-center"
                  onClick={onCopyInviteInstructions}
                  type="button"
                >
                  Skopiuj instrukcję
                </button>
              </div>
            ) : null}

            <div className="settings-list">
              <h3>Zaproszenia</h3>
              {projectInvitations.length > 0 ? (
                projectInvitations.map((invitation) => (
                  <div className="settings-list-row" key={invitation.id}>
                    <span>{invitation.email}</span>
                    <strong>{invitation.acceptedAt ? "przyjęte" : invitation.role}</strong>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--color-muted)]">
                  Brak zaproszeń dla aktywnego projektu.
                </p>
              )}
            </div>

            <div className="settings-summary">
              <div>
                <span>Zalogowano jako</span>
                <strong>{currentUser.email}</strong>
              </div>
              <button className="secondary-button" onClick={onSignOut} type="button">
                <LogOut aria-hidden="true" className="size-4" />
                Wyloguj
              </button>
            </div>

            {settingsError ? (
              <p className="form-error" role="alert">
                {settingsError}
              </p>
            ) : null}

            <div className="danger-zone">
              <div>
                <h3>Danger</h3>
                <p>Tej operacji nie da się cofnąć.</p>
              </div>
              <button
                className="danger-button justify-center"
                disabled={accountActionBusy}
                onClick={onDeleteOwnAccount}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                {accountActionBusy ? "Usuwam..." : "Usuń moje konto"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
