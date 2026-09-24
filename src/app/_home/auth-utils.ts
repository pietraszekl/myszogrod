export function getAuthRedirectUrl(kind: "default" | "recovery" = "default") {
  const origin = window.location.origin;

  if (kind === "recovery") {
    return `${origin}/?auth=recovery`;
  }

  return origin;
}

export function createInviteInstructions(email: string, projectName: string, appUrl: string) {
  return [
    `Zapraszam Cię do projektu "${projectName}" w Myszogrodzie.`,
    `Wejdź na ${appUrl} i zarejestruj albo zaloguj się adresem ${email}.`,
    "Po zalogowaniu dostęp do projektu zostanie nadany automatycznie.",
  ].join("\n");
}
