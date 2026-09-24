"use client";

import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { KeyRound, LogIn, LogOut, Pencil, Trash2, UserMinus, UserPlus, X } from "lucide-react";

import type { AuthMode, ProjectInvitation, ProjectMember } from "../types";

type SettingsPanelProps = {
  accountActionBusy: boolean;
  authBusy: boolean;
  authEmail: string;
  authMessage: string;
  authMode: AuthMode;
  authPassword: string;
  currentUser: User | null;
  invitationDeleteBusyId: string | null;
  inviteEmail: string;
  inviteInstructions: string;
  isActiveProjectOwner: boolean;
  memberActionBusyId: string | null;
  newAuthPassword: string;
  onAuthEmailChange: (email: string) => void;
  onAuthModeChange: (mode: AuthMode) => void;
  onAuthPasswordChange: (password: string) => void;
  onClose: () => void;
  onCopyInviteInstructions: () => void;
  onDeleteInvitation: (invitationId: string, email: string) => void;
  onDeleteOwnAccount: () => void;
  onEmailPasswordAuth: (event: FormEvent<HTMLFormElement>) => void;
  onInviteCollaborator: (event: FormEvent<HTMLFormElement>) => void;
  onInviteEmailChange: (email: string) => void;
  onNewAuthPasswordChange: (password: string) => void;
  onPasswordReset: () => void;
  onProjectNameDraftChange: (name: string) => void;
  onRecoveredPasswordUpdate: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveMember: (userId: string, email: string) => void;
  onRenameProject: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
  onAuthMessageClear: () => void;
  passwordRecoveryOpen: boolean;
  projectInvitations: ProjectInvitation[];
  projectMembers: ProjectMember[];
  projectName: string;
  projectNameDraft: string;
  projectRenameBusy: boolean;
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
  invitationDeleteBusyId,
  inviteEmail,
  inviteInstructions,
  isActiveProjectOwner,
  memberActionBusyId,
  newAuthPassword,
  onAuthEmailChange,
  onAuthMessageClear,
  onAuthModeChange,
  onAuthPasswordChange,
  onClose,
  onCopyInviteInstructions,
  onDeleteInvitation,
  onDeleteOwnAccount,
  onEmailPasswordAuth,
  onInviteCollaborator,
  onInviteEmailChange,
  onNewAuthPasswordChange,
  onPasswordReset,
  onProjectNameDraftChange,
  onRecoveredPasswordUpdate,
  onRemoveMember,
  onRenameProject,
  onSignOut,
  passwordRecoveryOpen,
  projectInvitations,
  projectMembers,
  projectName,
  projectNameDraft,
  projectRenameBusy,
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
            <div className="settings-list">
              <h3>Nazwa projektu</h3>
              {isActiveProjectOwner ? (
                <form className="settings-inline-form" onSubmit={onRenameProject}>
                  <label className="form-field">
                    <span>Nazwa</span>
                    <input
                      value={projectNameDraft}
                      onChange={(event) => onProjectNameDraftChange(event.target.value)}
                      placeholder="Nazwa projektu"
                      type="text"
                    />
                  </label>
                  <button
                    className="secondary-button justify-center"
                    disabled={projectRenameBusy || !projectNameDraft.trim()}
                    type="submit"
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                    {projectRenameBusy ? "Zapisuję..." : "Zapisz"}
                  </button>
                </form>
              ) : (
                <div className="settings-list-row">
                  <span>Aktywny projekt</span>
                  <strong>{projectName || "—"}</strong>
                </div>
              )}
            </div>

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
              <h3>Członkowie projektu</h3>
              {projectMembers.length > 0 ? (
                projectMembers.map((member) => (
                  <div className="settings-list-row" key={member.userId}>
                    <span>{member.email}</span>
                    <div className="flex items-center gap-2">
                      <strong>{member.role === "owner" ? "właściciel" : member.role}</strong>
                      {isActiveProjectOwner && member.role !== "owner" ? (
                        <button
                          aria-label={`Usuń ${member.email} z projektu`}
                          className="icon-button"
                          disabled={memberActionBusyId === member.userId}
                          onClick={() => onRemoveMember(member.userId, member.email)}
                          type="button"
                        >
                          <UserMinus aria-hidden="true" className="size-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--color-muted)]">
                  Brak członków dla aktywnego projektu.
                </p>
              )}
            </div>

            <div className="settings-list">
              <h3>Oczekujące zaproszenia</h3>
              {projectInvitations.length > 0 ? (
                projectInvitations.map((invitation) => (
                  <div className="settings-list-row" key={invitation.id}>
                    <span>{invitation.email}</span>
                    <div className="flex items-center gap-2">
                      <strong>{invitation.role}</strong>
                      {isActiveProjectOwner ? (
                        <button
                          aria-label={`Usuń zaproszenie dla ${invitation.email}`}
                          className="icon-button"
                          disabled={invitationDeleteBusyId === invitation.id}
                          onClick={() => onDeleteInvitation(invitation.id, invitation.email)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      ) : null}
                    </div>
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
