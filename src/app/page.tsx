"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { LocateFixed, Plus } from "lucide-react";

import { createClient as createSupabaseClient } from "@/lib/supabase/browser";
import {
  FilterPanel,
  MobileHeader,
  OpenFreePropertyMap,
  PendingInvitationsPanel,
  PropertyDetailsPanel,
  PropertyFormDialog,
  PropertyList,
  PropertySidebar,
  SettingsPanel,
} from "./_home/components";
import { createInviteInstructions, getAuthRedirectUrl } from "./_home/auth-utils";
import {
  mapPendingProjectInvitationRow,
  mapProjectInvitationRow,
  mapProjectMemberRow,
  mapProjectRow,
  mapPropertyRow,
} from "./_home/data-mappers";
import {
  getErrorMessage,
  isMissingSourceUrlColumnError,
  omitSourceUrl,
} from "./_home/errors";
import { geocodeLocation } from "./_home/geocoding";
import { initialProperties } from "./_home/property-options";
import {
  getLocationStatusText,
  getPropertyRating,
} from "./_home/property-utils";
import {
  hydratePropertyPhotoUrls,
  propertyPhotoBucket,
  signPhotoUrl,
} from "./_home/property-photos";
import type {
  AuthMode,
  Coordinates,
  PendingProjectInvitation,
  PendingProjectInvitationRow,
  Project,
  ProjectInvitation,
  ProjectInvitationRow,
  ProjectMember,
  ProjectMemberRow,
  ProjectRow,
  PropertyInsert,
  PropertyPayload,
  PropertyPhoto,
  PropertyRow,
} from "./_home/types";
import { usePropertyEditor } from "./_home/hooks/usePropertyEditor";
import { usePropertyFilters } from "./_home/hooks/usePropertyFilters";
import { useUserLocation } from "./_home/hooks/useUserLocation";

export default function HomePage() {
  const [properties, setProperties] = useState(initialProperties);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [newAuthPassword, setNewAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [projectRenameBusy, setProjectRenameBusy] = useState(false);
  const [projectInvitations, setProjectInvitations] = useState<ProjectInvitation[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [memberActionBusyId, setMemberActionBusyId] = useState<string | null>(null);
  const [invitationDeleteBusyId, setInvitationDeleteBusyId] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<PendingProjectInvitation[]>([]);
  const [pendingInvitationsError, setPendingInvitationsError] = useState("");
  const [invitationActionBusyId, setInvitationActionBusyId] = useState<string | null>(null);
  const [justAcceptedInvitation, setJustAcceptedInvitation] =
    useState<PendingProjectInvitation | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteInstructions, setInviteInstructions] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [accountActionBusy, setAccountActionBusy] = useState(false);
  const [propertiesLoadError, setPropertiesLoadError] = useState("");
  const [photoActionError, setPhotoActionError] = useState("");
  const [deleteActionError, setDeleteActionError] = useState("");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const {
    filteredProperties,
    filtersActive,
    filtersOpen,
    minimumRatingFilter,
    propertyStatusFilter,
    propertyTypeFilter,
    resetFilters,
    setFiltersOpen,
    setMinimumRatingFilter,
    setPropertyStatusFilter,
    setPropertyTypeFilter,
  } = usePropertyFilters(properties);
  const {
    locationStatus,
    requestCurrentLocation,
    userLocation,
    userLocationFocusRequest,
  } = useUserLocation();
  const {
    addPropertyOpen,
    addressLookup,
    addressVerified,
    closeAddProperty,
    editingPropertyId,
    isEditingProperty,
    manualPropertyCoordinates,
    openAddProperty,
    openEditProperty,
    propertyForm,
    propertyFormError,
    propertyFormRating,
    resetPropertyForm,
    setPropertyForm,
    setPropertyFormError,
    updateCriterionScore,
    updatePropertyForm,
    updatePropertyType,
  } = usePropertyEditor({
    isAuthenticated: Boolean(currentUser),
    onAuthRequired: () => setSettingsOpen(true),
    onEditStarted: () => {
      setSettingsOpen(false);
      setDetailsOpen(false);
    },
    properties,
  });

  const selectedProperty = selectedPropertyId
    ? properties.find((property) => property.id === selectedPropertyId)
    : undefined;
  const activeProject = activeProjectId
    ? projects.find((project) => project.id === activeProjectId)
    : undefined;
  const isActiveProjectOwner = Boolean(
    currentUser && activeProject && activeProject.ownerId === currentUser.id,
  );
  const activeSelectedPhotoIndex = selectedProperty
    ? Math.min(activePhotoIndex, Math.max(selectedProperty.photos.length - 1, 0))
    : 0;
  const selectedPropertyRating = selectedProperty
    ? getPropertyRating(selectedProperty)
    : null;

  useEffect(() => {
    const supabase = createSupabaseClient();
    let ignoreAuth = false;

    function showPasswordRecovery(message = "Ustaw nowe hasło do konta.") {
      setPasswordRecoveryOpen(true);
      setSettingsOpen(true);
      setAuthMessage(message);
    }

    async function handleAuthRedirect() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const authIntent = url.searchParams.get("auth");
      const authError = url.searchParams.get("auth_error");
      const authType = url.searchParams.get("type");
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const hashType = hashParams.get("type");
      const hashError = hashParams.get("error_description") ?? hashParams.get("error");
      const isRecoveryRedirect =
        authIntent === "recovery" ||
        authType === "recovery" ||
        hashType === "recovery";

      if (authError || hashError) {
        setSettingsOpen(true);
        setAuthMessage(`Link logowania/resetu hasła nie zadziałał: ${authError ?? hashError}`);
        url.searchParams.delete("auth_error");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        url.searchParams.delete("code");
        url.searchParams.delete("auth");
        url.searchParams.delete("type");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

        if (error) {
          setSettingsOpen(true);
          setAuthMessage(`Nie udało się użyć linku z emaila: ${error.message}`);
          return;
        }

        if (isRecoveryRedirect) {
          showPasswordRecovery();
        }
      } else if (isRecoveryRedirect || hashParams.has("access_token")) {
        showPasswordRecovery();
      }
    }

    void handleAuthRedirect();

    supabase.auth.getUser().then(({ data }) => {
      if (!ignoreAuth) {
        setCurrentUser(data.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user ?? null);

      if (event === "PASSWORD_RECOVERY") {
        showPasswordRecovery();
      }
    });

    return () => {
      ignoreAuth = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let ignoreProjects = false;

    async function loadProjects() {
      if (!currentUser) {
        setProjects([]);
        setActiveProjectId(null);
        setProjectInvitations([]);
        setProjectMembers([]);
        setProperties([]);
        return;
      }

      try {
        const supabase = createSupabaseClient();
        const { data: loadedProjects, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) {
          throw error;
        }

        let projectRows = loadedProjects as ProjectRow[] | null;

        if ((projectRows ?? []).length === 0) {
          const { data: createdProject, error: createError } = await supabase
            .rpc("create_project", { project_name: "Mój projekt" });

          if (createError || !createdProject) {
            throw new Error(createError?.message ?? "nie udało się utworzyć projektu startowego");
          }

          projectRows = [createdProject] as ProjectRow[];
        }

        if (!ignoreProjects) {
          const nextProjects = (projectRows ?? []).map(mapProjectRow);
          setProjects(nextProjects);
          setActiveProjectId((currentProjectId) =>
            currentProjectId && nextProjects.some((project) => project.id === currentProjectId)
              ? currentProjectId
              : nextProjects[0]?.id ?? null,
          );
          setSettingsError("");
        }
      } catch (error) {
        if (!ignoreProjects) {
          setSettingsError(`Nie udało się pobrać projektów: ${getErrorMessage(error)}`);
        }
      }
    }

    loadProjects();

    return () => {
      ignoreProjects = true;
    };
  }, [currentUser]);

  useEffect(() => {
    let ignorePendingInvitations = false;

    async function loadPendingInvitations() {
      if (!currentUser) {
        setPendingInvitations([]);
        return;
      }

      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase.rpc("list_my_pending_invitations");

        if (error) {
          throw error;
        }

        if (!ignorePendingInvitations) {
          setPendingInvitations(
            (data as PendingProjectInvitationRow[] | null ?? []).map(
              mapPendingProjectInvitationRow,
            ),
          );
          setPendingInvitationsError("");
        }
      } catch (error) {
        if (!ignorePendingInvitations) {
          setPendingInvitationsError(`Nie udało się pobrać zaproszeń: ${getErrorMessage(error)}`);
        }
      }
    }

    loadPendingInvitations();

    return () => {
      ignorePendingInvitations = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!justAcceptedInvitation) {
      return;
    }

    const timer = window.setTimeout(() => setJustAcceptedInvitation(null), 6000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [justAcceptedInvitation]);

  async function acceptPendingInvitation(invitation: PendingProjectInvitation) {
    if (!currentUser) {
      return;
    }

    setInvitationActionBusyId(invitation.id);

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.rpc("accept_project_invitation", {
        invitation_id: invitation.id,
      });

      if (error) {
        throw error;
      }

      setPendingInvitations((current) =>
        current.filter((pending) => pending.id !== invitation.id),
      );
      setPendingInvitationsError("");
      setJustAcceptedInvitation(invitation);

      const { data: loadedProjects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true });

      if (projectsError) {
        throw projectsError;
      }

      const nextProjects = (loadedProjects as ProjectRow[] | null ?? []).map(mapProjectRow);
      setProjects(nextProjects);
    } catch (error) {
      setPendingInvitationsError(`Nie udało się zaakceptować zaproszenia: ${getErrorMessage(error)}`);
    } finally {
      setInvitationActionBusyId(null);
    }
  }

  async function declinePendingInvitation(invitationId: string) {
    setInvitationActionBusyId(invitationId);

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.rpc("decline_project_invitation", {
        invitation_id: invitationId,
      });

      if (error) {
        throw error;
      }

      setPendingInvitations((current) =>
        current.filter((invitation) => invitation.id !== invitationId),
      );
      setPendingInvitationsError("");
    } catch (error) {
      setPendingInvitationsError(`Nie udało się odrzucić zaproszenia: ${getErrorMessage(error)}`);
    } finally {
      setInvitationActionBusyId(null);
    }
  }

  useEffect(() => {
    let ignoreLoadedProperties = false;

    async function loadProperties() {
      if (!currentUser || !activeProjectId) {
        setProperties([]);
        setPropertiesLoadError("");
        return;
      }

      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .eq("project_id", activeProjectId)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (!ignoreLoadedProperties) {
          const loadedProperties = await Promise.all(
            (data as PropertyRow[] | null ?? [])
              .map(mapPropertyRow)
              .map(hydratePropertyPhotoUrls),
          );
          setProperties(loadedProperties);
          setPropertiesLoadError("");
        }
      } catch (error) {
        if (!ignoreLoadedProperties) {
          const message = getErrorMessage(error);
          setPropertiesLoadError(`Nie udało się pobrać danych z Supabase: ${message}`);
        }
      }
    }

    loadProperties();

    return () => {
      ignoreLoadedProperties = true;
    };
  }, [activeProjectId, currentUser]);

  useEffect(() => {
    let ignoreSettings = false;

    async function loadProjectSettings() {
      if (!settingsOpen || !activeProjectId || !currentUser) {
        return;
      }

      try {
        const supabase = createSupabaseClient();
        const [invitationsResult, membersResult] = await Promise.all([
          supabase
            .from("project_invitations")
            .select("*")
            .eq("project_id", activeProjectId)
            .is("accepted_at", null)
            .order("created_at", { ascending: false }),
          supabase.rpc("list_project_members", { target_project_id: activeProjectId }),
        ]);

        if (invitationsResult.error) {
          throw invitationsResult.error;
        }

        if (membersResult.error) {
          throw membersResult.error;
        }

        if (!ignoreSettings) {
          setProjectInvitations(
            (invitationsResult.data as ProjectInvitationRow[] | null ?? []).map(
              mapProjectInvitationRow,
            ),
          );
          setProjectMembers(
            (membersResult.data as ProjectMemberRow[] | null ?? []).map(mapProjectMemberRow),
          );
          setSettingsError("");
        }
      } catch (error) {
        if (!ignoreSettings) {
          setSettingsError(`Nie udało się pobrać ustawień projektu: ${getErrorMessage(error)}`);
        }
      }
    }

    loadProjectSettings();

    return () => {
      ignoreSettings = true;
    };
  }, [activeProjectId, currentUser, settingsOpen]);

  const selectProperty = useCallback((propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setActivePhotoIndex(0);
    setPhotoActionError("");
    setDeleteActionError("");
    setSettingsOpen(false);
    closeAddProperty();
    setDetailsOpen(true);
    setFiltersOpen(false);
  }, [closeAddProperty, setFiltersOpen]);

  async function handleEmailPasswordAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = authEmail.trim();
    const password = authPassword;

    if (!email) {
      setAuthMessage("Podaj adres email.");
      return;
    }

    if (password.length < 6) {
      setAuthMessage("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }

    setAuthBusy(true);
    setAuthMessage(authMode === "sign-up" ? "Tworzę konto..." : "Loguję...");

    try {
      const supabase = createSupabaseClient();
      const { error } =
        authMode === "sign-up"
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: getAuthRedirectUrl(),
              },
            })
          : await supabase.auth.signInWithPassword({
              email,
              password,
            });

      if (error) {
        throw error;
      }

      setAuthPassword("");
      setAuthMessage(
        authMode === "sign-up"
          ? "Konto zostało utworzone. Jeśli Supabase wymaga potwierdzenia emaila, sprawdź skrzynkę."
          : "Zalogowano pomyślnie.",
      );
    } catch (error) {
      setAuthMessage(
        authMode === "sign-up"
          ? `Nie udało się utworzyć konta: ${getErrorMessage(error)}`
          : `Nie udało się zalogować: ${getErrorMessage(error)}`,
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function requestPasswordReset() {
    const email = authEmail.trim();

    if (!email) {
      setAuthMessage("Podaj email, na który wysłać link resetowania hasła.");
      return;
    }

    setAuthBusy(true);
    setAuthMessage("Wysyłam link resetowania hasła...");

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl("recovery"),
      });

      if (error) {
        throw error;
      }

      setAuthMessage("Wysłano link resetowania hasła. Sprawdź skrzynkę email.");
    } catch (error) {
      setAuthMessage(`Nie udało się wysłać resetu hasła: ${getErrorMessage(error)}`);
    } finally {
      setAuthBusy(false);
    }
  }

  async function updateRecoveredPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newAuthPassword.length < 6) {
      setAuthMessage("Nowe hasło musi mieć co najmniej 6 znaków.");
      return;
    }

    setAuthBusy(true);
    setAuthMessage("Zapisuję nowe hasło...");

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: newAuthPassword,
      });

      if (error) {
        throw error;
      }

      setNewAuthPassword("");
      setPasswordRecoveryOpen(false);
      setAuthMessage("Hasło zostało zmienione.");
    } catch (error) {
      setAuthMessage(`Nie udało się zmienić hasła: ${getErrorMessage(error)}`);
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    setCurrentUser(null);
    setProjects([]);
    setActiveProjectId(null);
    setProperties([]);
    setFiltersOpen(false);
    setSettingsOpen(false);
    setPasswordRecoveryOpen(false);
    setNewAuthPassword("");
    setAuthPassword("");
    setAuthMessage("");
    setInviteInstructions("");
  }

  function openSettings() {
    setProjectNameDraft(activeProject?.name ?? "");
    closeAddProperty();
    setDetailsOpen(false);
    setSettingsOpen(true);
  }

  function handleOpenAddProperty(coordinates?: Coordinates) {
    setSettingsOpen(false);
    setDetailsOpen(false);
    openAddProperty(coordinates);
  }

  async function renameActiveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = projectNameDraft.trim();

    if (!currentUser || !activeProjectId || !name) {
      setSettingsError("Podaj nazwę projektu.");
      return;
    }

    setProjectRenameBusy(true);

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("projects")
        .update({ name })
        .eq("id", activeProjectId)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "brak danych zwrotnych");
      }

      const updatedProject = mapProjectRow(data as ProjectRow);

      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === updatedProject.id ? updatedProject : project,
        ),
      );
      setProjectNameDraft(updatedProject.name);
      setSettingsError("Nazwa projektu została zaktualizowana.");
    } catch (error) {
      setSettingsError(`Nie udało się zmienić nazwy projektu: ${getErrorMessage(error)}`);
    } finally {
      setProjectRenameBusy(false);
    }
  }

  async function inviteCollaborator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = inviteEmail.trim().toLowerCase();
    if (!currentUser || !activeProjectId || !email) {
      setSettingsError("Wybierz projekt i podaj email współpracownika.");
      return;
    }

    const instructions = createInviteInstructions(
      email,
      activeProject?.name ?? "aktywny projekt",
      window.location.origin,
    );

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("project_invitations")
        .insert({
          project_id: activeProjectId,
          email,
          role: "member",
          invited_by: currentUser.id,
        })
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "brak danych zwrotnych");
      }

      setProjectInvitations((currentInvitations) => [
        mapProjectInvitationRow(data as ProjectInvitationRow),
        ...currentInvitations,
      ]);
      setInviteEmail("");
      setInviteInstructions(instructions);
      setSettingsError("Zaproszenie zapisane. Nie wysyłamy maila automatycznie.");
    } catch (error) {
      const message = getErrorMessage(error);

      if (
        message.includes("duplicate key") ||
        message.includes("project_invitations_project_id_email_key")
      ) {
        setInviteEmail("");
        setInviteInstructions(instructions);
        setSettingsError("Zaproszenie dla tego adresu już istnieje. Skopiuj instrukcję poniżej.");
        return;
      }

      setSettingsError(`Nie udało się dodać zaproszenia: ${message}`);
    }
  }

  async function removeProjectMember(userId: string, email: string) {
    if (!currentUser || !activeProjectId) {
      return;
    }

    const confirmed = window.confirm(`Usunąć ${email} z projektu?`);

    if (!confirmed) {
      return;
    }

    setMemberActionBusyId(userId);

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.rpc("remove_project_member", {
        target_project_id: activeProjectId,
        target_user_id: userId,
      });

      if (error) {
        throw error;
      }

      setProjectMembers((currentMembers) =>
        currentMembers.filter((member) => member.userId !== userId),
      );
      setSettingsError("Członek został usunięty z projektu.");
    } catch (error) {
      setSettingsError(`Nie udało się usunąć członka projektu: ${getErrorMessage(error)}`);
    } finally {
      setMemberActionBusyId(null);
    }
  }

  async function deleteProjectInvitation(invitationId: string, email: string) {
    const confirmed = window.confirm(`Anulować zaproszenie dla ${email}?`);

    if (!confirmed) {
      return;
    }

    setInvitationDeleteBusyId(invitationId);

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase
        .from("project_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) {
        throw error;
      }

      setProjectInvitations((currentInvitations) =>
        currentInvitations.filter((invitation) => invitation.id !== invitationId),
      );
      setSettingsError("Zaproszenie zostało anulowane.");
    } catch (error) {
      setSettingsError(`Nie udało się usunąć zaproszenia: ${getErrorMessage(error)}`);
    } finally {
      setInvitationDeleteBusyId(null);
    }
  }

  async function copyInviteInstructions() {
    if (!inviteInstructions) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteInstructions);
      setSettingsError("Instrukcja zaproszenia została skopiowana.");
    } catch {
      setSettingsError("Nie udało się skopiować automatycznie. Skopiuj tekst instrukcji ręcznie.");
    }
  }

  async function deleteOwnAccount() {
    if (!currentUser) {
      return;
    }

    const confirmed = window.confirm(
      "Usunąć Twoje konto? Tej operacji nie da się cofnąć. Jeśli jesteś właścicielem przestrzeni, powiązane dane mogą zostać usunięte.",
    );

    if (!confirmed) {
      return;
    }

    setAccountActionBusy(true);
    setSettingsError("");

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Nie udało się usunąć konta.");
      }

      const supabase = createSupabaseClient();
      await supabase.auth.signOut();
      setCurrentUser(null);
      setProjects([]);
      setActiveProjectId(null);
      setProperties([]);
      setProjectInvitations([]);
      setInviteInstructions("");
      setSettingsOpen(false);
    } catch (error) {
      setSettingsError(`Nie udało się usunąć konta: ${getErrorMessage(error)}`);
    } finally {
      setAccountActionBusy(false);
    }
  }

  function createPhoto(file: File, index: number): PropertyPhoto {
    return {
      file,
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `photo-${file.lastModified}-${file.size}-${index}-${file.name}`,
      name: file.name,
      url: URL.createObjectURL(file),
    };
  }

  function createPhotoStoragePath(projectId: string, scopeId: string, photo: PropertyPhoto) {
    const safeName = photo.name
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    return `${projectId}/${scopeId}/${photo.id}-${safeName || "photo"}`;
  }

  async function uploadPhotoForPersistence(
    photo: PropertyPhoto,
    projectId: string,
    scopeId: string,
  ): Promise<PropertyPhoto> {
    if (!photo.file) {
      return {
        id: photo.id,
        name: photo.name,
        path: photo.path,
        url: photo.url,
      };
    }

    const supabase = createSupabaseClient();
    const path = createPhotoStoragePath(projectId, scopeId, photo);
    const { error } = await supabase.storage
      .from(propertyPhotoBucket)
      .upload(path, photo.file, {
        cacheControl: "3600",
        contentType: photo.file.type,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    return signPhotoUrl({
      id: photo.id,
      name: photo.name,
      path,
      url: photo.url,
    });
  }

  async function preparePhotosForPersistence(
    photos: PropertyPhoto[],
    projectId: string,
    scopeId: string,
  ) {
    return Promise.all(
      photos.map((photo) => uploadPhotoForPersistence(photo, projectId, scopeId)),
    );
  }

  function getPhotosFromInput(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    return files
      .filter((file) => file.type.startsWith("image/"))
      .map((file, index) => createPhoto(file, index));
  }

  function addPhotosToForm(event: ChangeEvent<HTMLInputElement>) {
    const photos = getPhotosFromInput(event);
    if (photos.length === 0) {
      return;
    }

    setPropertyForm((currentForm) => ({
      ...currentForm,
      photos: [...currentForm.photos, ...photos],
    }));
  }

  async function addPhotosToSelectedProperty(event: ChangeEvent<HTMLInputElement>) {
    const photos = getPhotosFromInput(event);
    const property = selectedProperty;

    if (photos.length === 0 || !property) {
      return;
    }

    setPhotoActionError("");

    try {
      const persistedPhotos = await preparePhotosForPersistence(
        photos,
        property.projectId,
        property.id,
      );
      const nextPhotos = [...property.photos, ...persistedPhotos];
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("properties")
        .update({
          photo_count: nextPhotos.length,
          photos: nextPhotos,
        })
        .eq("id", property.id)
        .select("*");

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error(
          "Supabase nie zwrócił zaktualizowanego wpisu. Najpewniej polityka RLS blokuje aktualizację zdjęć dla anonimowego użytkownika.",
        );
      }

      if (data.length > 1) {
        throw new Error("Supabase zaktualizował więcej niż jeden wpis. Przerwano odświeżanie zdjęć.");
      }

      const updatedProperty = await hydratePropertyPhotoUrls(
        mapPropertyRow(data[0] as PropertyRow),
      );
      setProperties((currentProperties) =>
        currentProperties.map((currentProperty) =>
          currentProperty.id === updatedProperty.id ? updatedProperty : currentProperty,
        ),
      );
      setActivePhotoIndex(Math.max(updatedProperty.photos.length - photos.length, 0));
    } catch (error) {
      const message = getErrorMessage(error);
      setPhotoActionError(`Nie udało się zapisać zdjęć: ${message}`);
    }
  }

  async function handleAddProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const propertyBeingEdited = editingPropertyId
      ? properties.find((property) => property.id === editingPropertyId)
      : undefined;

    if (!currentUser) {
      setPropertyFormError("Zaloguj się, aby zapisywać nieruchomości.");
      return;
    }

    if (!activeProjectId && !propertyBeingEdited) {
      setPropertyFormError("Utwórz albo wybierz projekt przed dodaniem nieruchomości.");
      return;
    }

    if (editingPropertyId && !propertyBeingEdited) {
      setPropertyFormError("Nie znaleziono wpisu do edycji. Odśwież dane i spróbuj ponownie.");
      return;
    }

    const title = propertyForm.title.trim();
    const location = propertyForm.location.trim();
    const price = propertyForm.price.trim();
    const area = propertyForm.area.trim();
    const sourceUrl = propertyForm.sourceUrl.trim();
    const description = propertyForm.description.trim();
    const criteria = Object.entries(propertyForm.criteriaScores).map(([label, score]) => ({
      label,
      score: Number(score),
    }));

    if (!title || !location || !price || !area) {
      setPropertyFormError("Uzupełnij nazwę, lokalizację, cenę i powierzchnię.");
      return;
    }

    if (
      criteria.some(
        (criterion) =>
          !Number.isFinite(criterion.score) ||
          criterion.score < 1 ||
          criterion.score > 10,
      )
    ) {
      setPropertyFormError("Każde kryterium musi mieć ocenę od 1 do 10.");
      return;
    }

    let propertyCoordinates: Coordinates;

    try {
      propertyCoordinates =
        manualPropertyCoordinates ??
        (propertyBeingEdited && propertyBeingEdited.location === location
          ? propertyBeingEdited.coordinates
          : null) ??
        (
          addressLookup.status === "found" &&
          addressLookup.query === location &&
          addressLookup.coordinates
            ? {
                lat: addressLookup.coordinates.lat,
                lng: addressLookup.coordinates.lng,
              }
            : (await geocodeLocation(location)).coordinates
        );
    } catch (error) {
      const message = getErrorMessage(error);
      setPropertyFormError(`Nie udało się ustalić punktu na mapie: ${message}`);
      return;
    }

    let persistedPhotos: PropertyPhoto[];
    const photoProjectId = propertyBeingEdited?.projectId ?? activeProjectId!;
    const photoScopeId =
      propertyBeingEdited?.id ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `draft-${Date.now()}`);

    try {
      persistedPhotos = await preparePhotosForPersistence(
        propertyForm.photos,
        photoProjectId,
        photoScopeId,
      );
    } catch (error) {
      const message = getErrorMessage(error);
      setPropertyFormError(`Nie udało się przygotować zdjęć: ${message}`);
      return;
    }

    const propertyPayload: PropertyPayload = {
      project_id: propertyBeingEdited?.projectId ?? activeProjectId!,
      title,
      property_type: propertyForm.type,
      location,
      price,
      area,
      status: propertyForm.status,
      source_url: sourceUrl || null,
      description:
        description ||
        (propertyBeingEdited
          ? ""
          : "Nowa nieruchomość dodana ręcznie. Uzupełnij notatki, zdjęcia i kryteria w kolejnym kroku."),
      photos: persistedPhotos,
      criteria,
      coordinates: propertyCoordinates,
    };

    if (propertyBeingEdited) {
      try {
        const supabase = createSupabaseClient();
        let { data, error } = await supabase
          .from("properties")
          .update({
            ...propertyPayload,
            photo_count: persistedPhotos.length,
          })
          .eq("id", propertyBeingEdited.id)
          .select("*");

        if (error && isMissingSourceUrlColumnError(error)) {
          const fallbackPayload = omitSourceUrl(propertyPayload);
          const fallbackResult = await supabase
            .from("properties")
            .update({
              ...fallbackPayload,
              photo_count: persistedPhotos.length,
            })
            .eq("id", propertyBeingEdited.id)
            .select("*");
          data = fallbackResult.data;
          error = fallbackResult.error;
        }

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error(
            "Supabase nie zwrócił zaktualizowanego wpisu. Najpewniej polityka RLS blokuje edycję dla anonimowego użytkownika.",
          );
        }

        if (data.length > 1) {
          throw new Error("Supabase zaktualizował więcej niż jeden wpis.");
        }

        const updatedProperty = await hydratePropertyPhotoUrls(
          mapPropertyRow(data[0] as PropertyRow),
        );

        setProperties((currentProperties) =>
          currentProperties.map((property) =>
            property.id === updatedProperty.id ? updatedProperty : property,
          ),
        );
        setSelectedPropertyId(updatedProperty.id);
      } catch (error) {
        const message = getErrorMessage(error);
        setPropertyFormError(`Nie udało się zaktualizować wpisu: ${message}`);
        return;
      }

      closeAddProperty();
      return;
    }

    const propertyInsert: PropertyInsert = {
      ...propertyPayload,
      created_by: currentUser.id,
      note_count: 0,
      photo_count: persistedPhotos.length,
      x: 50,
      y: 50,
    };

    try {
      const supabase = createSupabaseClient();
      let { data, error } = await supabase
        .from("properties")
        .insert(propertyInsert)
        .select("*")
        .single();

      if (error && isMissingSourceUrlColumnError(error)) {
        const fallbackInsert = omitSourceUrl(propertyInsert);
        const fallbackResult = await supabase
          .from("properties")
          .insert(fallbackInsert)
          .select("*")
          .single();
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error || !data) {
        throw new Error(error?.message ?? "brak danych zwrotnych");
      }

      const newProperty = await hydratePropertyPhotoUrls(mapPropertyRow(data as PropertyRow));

      setProperties((currentProperties) => [newProperty, ...currentProperties]);
      setSelectedPropertyId(newProperty.id);
    } catch (error) {
      const message = getErrorMessage(error);
      setPropertyFormError(
        `Nie udało się zapisać w Supabase: ${message}`,
      );
      return;
    }
    resetPropertyForm();
  }

  async function deleteSelectedProperty() {
    if (!selectedProperty) {
      return;
    }

    const shouldDelete = window.confirm(
      `Usunąć wpis "${selectedProperty.title}"? Tej operacji nie da się cofnąć.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeleteActionError("");

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .rpc("delete_property", { property_id: selectedProperty.id });

      if (error) {
        throw error;
      }

      if (data !== selectedProperty.id) {
        throw new Error("Supabase nie potwierdził usunięcia rekordu.");
      }

      setProperties((currentProperties) =>
        currentProperties.filter((property) => property.id !== selectedProperty.id),
      );
      setSelectedPropertyId(null);
      setDetailsOpen(false);
    } catch (error) {
      const message = getErrorMessage(error);
      setDeleteActionError(`Nie udało się usunąć wpisu: ${message}`);
    }
  }

  function renderFilterPanel(label: string, includePropertyList = false) {
    if (!currentUser || !filtersOpen) {
      return null;
    }

    return (
      <FilterPanel
        filtersActive={filtersActive}
        label={label}
        minimumRatingFilter={minimumRatingFilter}
        onMinimumRatingFilterChange={setMinimumRatingFilter}
        onPropertyStatusFilterChange={setPropertyStatusFilter}
        onPropertyTypeFilterChange={setPropertyTypeFilter}
        onResetFilters={resetFilters}
        propertyList={
          includePropertyList ? (
            <PropertyList
              filteredProperties={filteredProperties}
              isAuthenticated={Boolean(currentUser)}
              onAddProperty={() => handleOpenAddProperty()}
              onOpenSettings={openSettings}
              onResetFilters={resetFilters}
              onSelectProperty={selectProperty}
              properties={properties}
              propertiesLoadError={propertiesLoadError}
              selectedPropertyId={selectedPropertyId}
            />
          ) : undefined
        }
        propertyStatusFilter={propertyStatusFilter}
        propertyTypeFilter={propertyTypeFilter}
      />
    );
  }

  return (
    <main className="app-map-root overflow-hidden bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <section className="app-map-stage relative">
        <OpenFreePropertyMap
          properties={filteredProperties}
          selectedPropertyId={selectedPropertyId}
          userLocation={userLocation}
          userLocationFocusRequest={userLocationFocusRequest}
          onSelect={selectProperty}
          onLongPress={handleOpenAddProperty}
        />

        <MobileHeader
          filterPanel={renderFilterPanel("Filtry mapy", true)}
          filtersOpen={filtersOpen}
          isAuthenticated={Boolean(currentUser)}
          onOpenSettings={openSettings}
          onToggleFilters={() => setFiltersOpen((isOpen) => !isOpen)}
        />

        <PendingInvitationsPanel
          busyInvitationId={invitationActionBusyId}
          error={pendingInvitationsError}
          invitations={pendingInvitations}
          justAcceptedInvitation={justAcceptedInvitation}
          onAccept={acceptPendingInvitation}
          onDecline={declinePendingInvitation}
          onDismissJustAccepted={() => setJustAcceptedInvitation(null)}
        />

        <PropertySidebar
          filterPanel={renderFilterPanel("Filtry listy")}
          filteredProperties={filteredProperties}
          filtersOpen={filtersOpen}
          isAuthenticated={Boolean(currentUser)}
          onAddProperty={() => handleOpenAddProperty()}
          onOpenSettings={openSettings}
          onResetFilters={resetFilters}
          onSelectProperty={selectProperty}
          onToggleFilters={() => setFiltersOpen((isOpen) => !isOpen)}
          properties={properties}
          propertiesLoadError={propertiesLoadError}
          selectedPropertyId={selectedPropertyId}
        />

        {selectedProperty && selectedPropertyRating !== null ? (
          <PropertyDetailsPanel
            activePhotoIndex={activeSelectedPhotoIndex}
            deleteActionError={deleteActionError}
            mode="sidebar"
            onAddPhotos={addPhotosToSelectedProperty}
            onClose={() => setSelectedPropertyId(null)}
            onDelete={deleteSelectedProperty}
            onEdit={openEditProperty}
            onPhotoIndexChange={setActivePhotoIndex}
            photoActionError={photoActionError}
            property={selectedProperty}
            rating={selectedPropertyRating}
          />
        ) : null}

        <div className="map-action-stack">
          <div
            className="location-chip"
            data-state={locationStatus}
            role="status"
          >
            {getLocationStatusText(locationStatus)}
          </div>
          <button
            className="location-button"
            aria-label="Pokaż moją lokalizację i promień 2 kilometry"
            disabled={locationStatus === "loading"}
            onClick={requestCurrentLocation}
            type="button"
          >
            <LocateFixed aria-hidden="true" className="size-5" />
          </button>
          {currentUser ? (
            <button
              className="map-add-button"
              aria-label="Dodaj nieruchomość"
              onClick={() => handleOpenAddProperty()}
              type="button"
            >
              <Plus aria-hidden="true" className="size-5" />
            </button>
          ) : null}
        </div>

        {detailsOpen && selectedProperty && selectedPropertyRating !== null ? (
          <div className="lg:hidden">
            <PropertyDetailsPanel
              activePhotoIndex={activeSelectedPhotoIndex}
              deleteActionError={deleteActionError}
              mode="dialog"
              onAddPhotos={addPhotosToSelectedProperty}
              onClose={() => setDetailsOpen(false)}
              onDelete={deleteSelectedProperty}
              onEdit={openEditProperty}
              onPhotoIndexChange={setActivePhotoIndex}
              photoActionError={photoActionError}
              property={selectedProperty}
              rating={selectedPropertyRating}
            />
          </div>
        ) : null}

        {settingsOpen ? (
          <SettingsPanel
            accountActionBusy={accountActionBusy}
            authBusy={authBusy}
            authEmail={authEmail}
            authMessage={authMessage}
            authMode={authMode}
            authPassword={authPassword}
            canInvite={Boolean(activeProjectId)}
            currentUser={currentUser}
            invitationDeleteBusyId={invitationDeleteBusyId}
            inviteEmail={inviteEmail}
            inviteInstructions={inviteInstructions}
            memberActionBusyId={memberActionBusyId}
            newAuthPassword={newAuthPassword}
            onAuthEmailChange={setAuthEmail}
            onAuthMessageClear={() => setAuthMessage("")}
            onAuthModeChange={setAuthMode}
            onAuthPasswordChange={setAuthPassword}
            onClose={() => setSettingsOpen(false)}
            onCopyInviteInstructions={copyInviteInstructions}
            onDeleteInvitation={deleteProjectInvitation}
            onDeleteOwnAccount={deleteOwnAccount}
            onEmailPasswordAuth={handleEmailPasswordAuth}
            onInviteCollaborator={inviteCollaborator}
            onInviteEmailChange={setInviteEmail}
            onNewAuthPasswordChange={setNewAuthPassword}
            onPasswordReset={requestPasswordReset}
            onProjectNameDraftChange={setProjectNameDraft}
            onRecoveredPasswordUpdate={updateRecoveredPassword}
            onRemoveMember={removeProjectMember}
            onRenameProject={renameActiveProject}
            onSignOut={signOut}
            passwordRecoveryOpen={passwordRecoveryOpen}
            projectInvitations={projectInvitations}
            projectMembers={projectMembers}
            projectName={activeProject?.name ?? ""}
            projectNameDraft={projectNameDraft}
            projectRenameBusy={projectRenameBusy}
            isActiveProjectOwner={isActiveProjectOwner}
            settingsError={settingsError}
          />
        ) : null}

        {addPropertyOpen ? (
          <PropertyFormDialog
            addressLookup={addressLookup}
            addressVerified={addressVerified}
            form={propertyForm}
            formError={propertyFormError}
            isEditing={isEditingProperty}
            manualCoordinates={manualPropertyCoordinates}
            onAddPhotos={addPhotosToForm}
            onClose={closeAddProperty}
            onCriterionScoreChange={updateCriterionScore}
            onFormChange={updatePropertyForm}
            onPropertyTypeChange={updatePropertyType}
            onSubmit={handleAddProperty}
            rating={propertyFormRating}
          />
        ) : null}
      </section>
    </main>
  );
}
