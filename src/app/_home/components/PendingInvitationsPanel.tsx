"use client";

import { Check, Mail, PartyPopper, X } from "lucide-react";

import type { PendingProjectInvitation } from "../types";

type PendingInvitationsPanelProps = {
  busyInvitationId: string | null;
  error: string;
  invitations: PendingProjectInvitation[];
  justAcceptedInvitation: PendingProjectInvitation | null;
  onAccept: (invitation: PendingProjectInvitation) => void;
  onDecline: (invitationId: string) => void;
  onDismissJustAccepted: () => void;
};

export function PendingInvitationsPanel({
  busyInvitationId,
  error,
  invitations,
  justAcceptedInvitation,
  onAccept,
  onDecline,
  onDismissJustAccepted,
}: PendingInvitationsPanelProps) {
  const hasContent = invitations.length > 0 || Boolean(justAcceptedInvitation);

  if (!hasContent) {
    if (!error) {
      return null;
    }

    return (
      <div aria-label="Błąd zaproszeń" className="invite-banner" role="status">
        <p className="form-error">{error}</p>
      </div>
    );
  }

  return (
    <div
      aria-label="Oczekujące zaproszenia"
      aria-modal="true"
      className="invite-gate"
      role="alertdialog"
    >
      <section className="invite-gate__panel">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
          {invitations.length > 0 ? "Zanim przejdziesz dalej" : "Gotowe"}
        </p>
        <h2 className="mt-2 text-xl font-semibold">
          {invitations.length > 0
            ? "Zdecyduj o oczekujących zaproszeniach"
            : "Dołączono do projektu"}
        </h2>

        <div className="mt-4 grid gap-3">
          {justAcceptedInvitation ? (
            <div className="invite-banner-row invite-banner-row--success">
              <div className="invite-banner-row__info">
                <PartyPopper aria-hidden="true" className="size-4" />
                <div>
                  <strong>Dołączono do „{justAcceptedInvitation.projectName}”</strong>
                  <span>
                    {justAcceptedInvitation.invitedByEmail
                      ? `Możesz teraz współpracować z ${justAcceptedInvitation.invitedByEmail}.`
                      : "Możesz teraz współpracować w tym projekcie."}
                  </span>
                </div>
              </div>
              {invitations.length === 0 ? (
                <button
                  className="primary-button justify-center"
                  onClick={onDismissJustAccepted}
                  type="button"
                >
                  Świetnie, przejdź dalej
                </button>
              ) : null}
            </div>
          ) : null}

          {invitations.map((invitation) => {
            const busy = busyInvitationId === invitation.id;

            return (
              <div className="invite-banner-row" key={invitation.id}>
                <div className="invite-banner-row__info">
                  <Mail aria-hidden="true" className="size-4" />
                  <div>
                    <strong>{invitation.projectName}</strong>
                    <span>
                      {invitation.invitedByEmail
                        ? `Zaproszenie od ${invitation.invitedByEmail}`
                        : "Zaproszenie do współpracy"}
                    </span>
                  </div>
                </div>
                <div className="invite-banner-row__actions">
                  <button
                    className="secondary-button justify-center"
                    disabled={busy}
                    onClick={() => onDecline(invitation.id)}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-4" />
                    Odrzuć
                  </button>
                  <button
                    className="primary-button justify-center"
                    disabled={busy}
                    onClick={() => onAccept(invitation)}
                    type="button"
                  >
                    <Check aria-hidden="true" className="size-4" />
                    Akceptuj
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {error ? (
          <p className="form-error mt-3" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
