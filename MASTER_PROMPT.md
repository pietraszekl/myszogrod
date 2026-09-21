# MYSZOGRÓD — MASTER PROJECT PROMPT

## 1. Rola tego dokumentu

Ten dokument jest głównym źródłem prawdy (Single Source of Truth) dla projektu **Myszogród**.

Każde AI, agent codingowy lub developer pracujący nad projektem musi najpierw zapoznać się z tym dokumentem.

Nie wolno zmieniać kluczowych decyzji projektowych bez wyraźnej zgody właściciela projektu.

Jeżeli nowe wymaganie jest sprzeczne z tym dokumentem, należy:
1. wskazać konflikt,
2. opisać konsekwencje,
3. poprosić o decyzję,
4. nie zmieniać samodzielnie istniejącej architektury.

---

# 2. Cel projektu

Myszogród to prywatna aplikacja webowa/mobile-first pomagająca użytkownikom:

- wyszukiwać,
- zapisywać,
- analizować,
- porównywać
- i wspólnie oceniać

nieruchomości, przede wszystkim:

- działki / ziemię,
- domy.

Pierwszym obszarem działania jest **województwo śląskie**.

Aplikacja nie pobiera ofert nieruchomości z zewnętrznych API.

Wszystkie nieruchomości są dodawane ręcznie przez użytkowników.

Najważniejszym elementem aplikacji jest **mapa**.

Aplikacja ma być przede wszystkim narzędziem wizualnego porównywania nieruchomości na mapie, a nie klasycznym portalem ogłoszeniowym.

---

# 3. Najważniejsza zasada UX

## MAP-FIRST

Mapa Google jest głównym ekranem aplikacji.

Lista nieruchomości jest elementem pomocniczym.

Użytkownik powinien móc:

1. otworzyć projekt,
2. zobaczyć wszystkie nieruchomości na mapie,
3. natychmiast rozpoznać ich typ,
4. natychmiast rozpoznać ich rating po kolorze,
5. kliknąć nieruchomość,
6. zobaczyć jej podstawowe informacje,
7. wejść w szczegóły.

Mapa nie może być dodatkiem do listy.

Mapa jest centralnym elementem produktu.

---

# 4. Typy nieruchomości

MVP obsługuje dwa typy:

## ZIEMIA

Działki, grunty, tereny przeznaczone lub potencjalnie przeznaczone pod budowę itd.

## DOM

Istniejące budynki mieszkalne / domy.

Architektura powinna pozwalać w przyszłości na dodanie kolejnych typów:

- mieszkanie,
- lokal usługowy,
- gospodarstwo,
- działka rekreacyjna,
- nieruchomość inwestycyjna.

Nie należy kodować logiki aplikacji w sposób uniemożliwiający dodanie kolejnych typów.

---

# 5. Lokalizacja nieruchomości

Każda nieruchomość MUSI posiadać lokalizację.

Minimalne dane:

- latitude
- longitude

Nieruchomość bez lokalizacji nie może zostać zapisana jako kompletna nieruchomość.

Każda zapisana nieruchomość musi zostać naniesiona na mapę.

Lokalizacja jest kluczową właściwością nieruchomości.

---

# 6. Google Maps

Mapa będzie oparta o:

**Google Maps JavaScript API**

Wykorzystujemy Google Maps jako mapę bazową.

Nie pobieramy z Google danych o nieruchomościach.

Google Maps służy przede wszystkim do:

- wizualizacji lokalizacji,
- poruszania się po mapie,
- zaznaczania lokalizacji,
- prezentowania markerów,
- interakcji z nieruchomościami.

API key oraz inne sekrety muszą być przechowywane wyłącznie w zmiennych środowiskowych.

Nigdy nie commitować sekretów do repozytorium.

---

# 7. Markery nieruchomości

Markery są bardzo ważnym elementem designu.

Nie używać domyślnych, klasycznych pinezek Google jako głównego UI.

Markery mają być customowe.

## Ikona

Ikona musi być wykonana jako:

**outline SVG**

Ikona reprezentuje TYP nieruchomości.

Przykładowo:

- ZIEMIA → outline symbolizujący działkę/teren
- DOM → outline domu

Ikona NIE reprezentuje ratingu.

---

# 8. Kolor markera

Kolor markera reprezentuje rating nieruchomości.

Zasada:

**IKONA = TYP**

**KOLOR = RATING**

Marker może posiadać delikatny, półprzezroczysty radial/halo/background wokół SVG.

Nie powinien wyglądać jak ciężka pinezka.

Design powinien być lekki, premium i nowoczesny.

Przykładowa koncepcja:

```text
      translucent halo
       ┌───────────┐
      /             \
     |      SVG      |
      \             /
       └───────────┘
```

Halo powinno być subtelne i nie może powodować wizualnego bałaganu na mapie.

Wybrany marker może otrzymywać:

- większy rozmiar,
- mocniejsze halo,
- subtelną animację,
- wyraźniejsze podświetlenie.

---

# 9. Rating nieruchomości

Każda nieruchomość jest oceniana w skali:

**1–10**

Nie chcemy ręcznego wpisywania tylko jednej oceny końcowej.

Ocena końcowa ma wynikać z odpowiedzi na zestaw pytań/kryteriów.

Przykład:

- lokalizacja,
- dojazd,
- stan techniczny,
- cena,
- potencjał,
- media,
- otoczenie itd.

Każde pytanie może mieć ocenę:

1–10.

---

# 10. Różne pytania dla różnych typów

Zestaw pytań musi zależeć od typu nieruchomości.

Przykład:

## ZIEMIA

Możliwe kryteria:

- lokalizacja,
- cena,
- cena/m²,
- kształt działki,
- MPZP,
- możliwość zabudowy,
- media,
- droga,
- dojazd,
- ukształtowanie terenu,
- sąsiedztwo,
- potencjał.

## DOM

Możliwe kryteria:

- lokalizacja,
- cena,
- powierzchnia domu,
- powierzchnia działki,
- stan techniczny,
- standard,
- układ pomieszczeń,
- ogrzewanie,
- media,
- garaż,
- ogród,
- sąsiedztwo,
- dojazd.

Powyższe przykłady nie są jeszcze zamkniętą listą.

System pytań powinien być konfigurowalny.

---

# 11. Konfigurowalny system kryteriów

Kryteria nie powinny być hard-coded bezpośrednio w komponentach UI.

Powinny być reprezentowane w danych.

Przykładowa koncepcja:

```text
Property Type
    ↓
Criteria Set
    ↓
Criteria
    ↓
Rating 1–10
```

Dzięki temu Superadmin może w przyszłości zmienić:

- pytania,
- kolejność pytań,
- dostępność pytania,
- nazwy,
- opisy,
- wagi.

---

# 12. Wynik końcowy

System powinien wyliczać rating końcowy nieruchomości na podstawie ocen kryteriów.

Docelowo należy przewidzieć możliwość wag.

Przykład:

```text
Lokalizacja       9
Cena              8
Dojazd            7
Media             6
Sąsiedztwo        9
```

System wylicza rating końcowy.

Rating końcowy:

**1–10**

Ten rating jest następnie używany do:

- koloru markera,
- sortowania,
- filtrowania,
- porównywania nieruchomości.

---

# 13. Zdjęcia

Każda nieruchomość może posiadać wiele zdjęć.

Zdjęcia muszą być możliwe do dodania:

- z komputera,
- z telefonu,
- bezpośrednio z aparatu telefonu.

Na mobile musi działać natywny flow wyboru/zrobienia zdjęcia.

Przykładowo:

```html
<input
  type="file"
  accept="image/*"
  capture="environment"
/>
```

Zdjęcia przechowywane są w:

**Supabase Storage**

Nie przechowywać binarnych zdjęć bezpośrednio w PostgreSQL.

Baza przechowuje metadata zdjęć oraz ścieżkę do storage.

---

# 14. Notatki

Każda nieruchomość może mieć notatki.

Minimalnie:

- treść,
- autor,
- data utworzenia,
- data modyfikacji.

Notatki są współdzielone w ramach projektu zgodnie z uprawnieniami użytkownika.

---

# 15. Linki do ogłoszeń

Każda nieruchomość może mieć jeden lub więcej linków do zewnętrznych ogłoszeń.

Przykładowo:

- OLX,
- Otodom,
- Morizon,
- nieruchomości lokalne,
- strona agencji.

Aplikacja nie pobiera automatycznie danych z tych serwisów.

Przechowujemy tylko link.

Użytkownik może kliknąć link i przejść do zewnętrznego ogłoszenia.

---

# 16. Projekty

Aplikacja jest oparta na koncepcji:

**PROJECT**

Projekt to wspólna przestrzeń, w której użytkownicy analizują nieruchomości.

Przykłady:

- Dom dla rodziny
- Działka pod dom
- Działki Śląsk 2026

Projekt posiada:

- nazwę,
- opis,
- ownera,
- członków,
- nieruchomości,
- ustawienia,
- widoczność.

---

# 17. Project Owner

Każdy projekt posiada:

**Project Owner**

Owner jest użytkownikiem, który utworzył projekt.

Owner może:

- zarządzać projektem,
- zatwierdzać prośby o dołączenie,
- odrzucać prośby,
- usuwać członków,
- zarządzać dostępem,
- zarządzać nieruchomościami.

Nie używać pojęcia "original user" w modelu danych.

Używać:

**owner**

lub:

**project_owner**

---

# 18. Wyszukiwanie projektów

Użytkownik powinien mieć możliwość wyszukania istniejącego projektu.

Przykładowy flow:

```text
Projects
    ↓
Search
    ↓
Project
    ↓
Request to Join
    ↓
Owner
    ↓
Approve / Reject
```

---

# 19. Join Request

Użytkownik nie może automatycznie dołączyć do projektu.

Użytkownik wysyła:

**Join Request**

Owner projektu otrzymuje prośbę.

Owner może:

- APPROVE
- REJECT

Dopiero po APPROVE użytkownik otrzymuje dostęp do projektu.

---

# 20. Widoczność projektu

Projekt powinien mieć możliwość określenia widoczności.

Minimum:

### PRIVATE

Projekt nie pojawia się w publicznym wyszukiwaniu.

### DISCOVERABLE

Projekt można znaleźć i można wysłać prośbę o dołączenie.

Architektura powinna umożliwiać późniejsze dodanie bardziej zaawansowanych poziomów widoczności.

---

# 21. Użytkownicy i logowanie

Nie ma publicznej rejestracji.

Użytkownicy nie zakładają sami kont.

Konta tworzy:

**SUPERADMIN**

Superadmin nadaje:

- login/email,
- hasło,
- podstawowe dane użytkownika.

Logowanie realizowane przez:

**Supabase Auth**

---

# 22. Role

MVP:

## SUPERADMIN

Pełny dostęp do całego systemu.

Może:

- tworzyć użytkowników,
- usuwać/dezaktywować użytkowników,
- zarządzać użytkownikami,
- tworzyć projekty,
- zarządzać projektami,
- zarządzać wszystkimi nieruchomościami,
- zarządzać kryteriami,
- zarządzać konfiguracją,
- zarządzać członkostwem.

## USER

Może:

- logować się,
- przeglądać projekty, do których ma dostęp,
- wyszukiwać projekty,
- wysyłać Join Request,
- dodawać nieruchomości,
- edytować nieruchomości zgodnie z uprawnieniami projektu,
- dodawać zdjęcia,
- dodawać notatki,
- dodawać linki,
- oceniać nieruchomości.

W przyszłości można dodać:

**PROJECT_ADMIN**

ale nie jest wymagany w MVP.

---

# 23. Superadmin

Pierwszy użytkownik systemu będzie Superadminem.

Superadmin jest właścicielem administracyjnym systemu.

Nie należy hard-code'ować jego danych w kodzie aplikacji.

Rola powinna być przechowywana w bazie danych i egzekwowana przez mechanizmy bezpieczeństwa.

---

# 24. Security

Bezpieczeństwo jest częścią architektury, a nie tylko frontendu.

Backend:

**Supabase**

Database:

**PostgreSQL**

Security:

**Row Level Security (RLS)**

RLS musi zapewnić między innymi:

- użytkownik widzi tylko projekty, do których ma dostęp,
- użytkownik nie może odczytać prywatnego projektu, którego nie jest członkiem,
- użytkownik nie może sam nadać sobie członkostwa,
- użytkownik nie może sam zatwierdzić Join Request,
- użytkownik nie może zmienić ownera projektu,
- użytkownik nie może zmienić swojej roli na SUPERADMIN,
- Superadmin ma pełny dostęp.

Nie polegać wyłącznie na ukrywaniu funkcji w frontendzie.

---

# 25. Tech Stack

Rekomendowany stack MVP:

## Frontend

**Next.js**

**TypeScript**

**Tailwind CSS**

**shadcn/ui**

## Backend / Platform

**Supabase**

## Database

**PostgreSQL**

## Authentication

**Supabase Auth**

## File Storage

**Supabase Storage**

## Maps

**Google Maps JavaScript API**

## Map markers

Custom HTML/SVG markers / Google Maps Advanced Markers.

---

# 26. Frontend architecture

Preferować:

- reusable components,
- feature-based architecture,
- strong TypeScript types,
- server/client separation,
- clean data access layer,
- validation schemas,
- centralized design tokens.

Nie umieszczać logiki biznesowej bezpośrednio w dużych komponentach UI.

---

# 27. Design

Design ma być:

**premium, nowoczesny, sexy, minimalistyczny i bardzo czytelny.**

Inspiracje UX:

- Airbnb,
- nowoczesne aplikacje SaaS,
- nowoczesne aplikacje mapowe,
- premium real estate applications.

Nie kopiować brandingu ani layoutów innych firm.

Inspiracją są przede wszystkim:

- sposób prezentacji informacji,
- card-based UI,
- duże zdjęcia,
- whitespace,
- subtelne animacje,
- floating elements,
- bottom sheets,
- czytelna hierarchia informacji.

---

# 28. Mobile-first

Aplikacja musi być projektowana mobile-first.

Najważniejsze działania na telefonie:

- oglądanie mapy,
- wybieranie nieruchomości,
- dodawanie nieruchomości,
- robienie zdjęć,
- ocenianie,
- dodawanie notatek.

Nie należy traktować mobile jako pomniejszonej wersji desktopu.

Mobile powinien mieć własne wzorce interakcji:

- bottom sheet,
- floating buttons,
- sticky actions,
- touch-friendly controls,
- swipe gestures tam, gdzie mają sens.

---

# 29. Desktop

Na desktopie można wykorzystać:

- duży obszar mapy,
- panel filtrów,
- side panel,
- property drawer,
- listę nieruchomości,
- szczegóły nieruchomości.

Mapa nadal pozostaje głównym elementem.

---

# 30. Property Detail

Kliknięcie nieruchomości na mapie otwiera szybki preview.

Preview powinien zawierać:

- zdjęcie główne,
- typ,
- rating,
- cenę,
- lokalizację,
- podstawowe informacje,
- CTA "Zobacz szczegóły".

Pełne szczegóły nieruchomości powinny zawierać:

- galerię zdjęć,
- dane,
- rating,
- wszystkie kryteria,
- notatki,
- linki,
- historię,
- lokalizację.

---

# 31. Dodawanie nieruchomości

Flow:

```text
Add Property
    ↓
Choose type
    ↓
ZIEMIA / DOM
    ↓
Location
    ↓
Basic data
    ↓
Photos
    ↓
Criteria
    ↓
Rating
    ↓
Notes
    ↓
Links
    ↓
Save
    ↓
Property appears on map
```

Po zapisaniu nieruchomość musi pojawić się na mapie.

---

# 32. Filtry

Docelowo mapa powinna umożliwiać filtrowanie między innymi po:

- typie,
- ratingu,
- cenie,
- powierzchni,
- lokalizacji,
- statusie,
- kryteriach.

Filtry powinny aktualizować markery na mapie.

---

# 33. Porównywanie

Użytkownik powinien móc zaznaczyć kilka nieruchomości i porównać je.

Porównanie może zawierać:

- cena,
- powierzchnia,
- rating,
- poszczególne kryteria,
- podstawowe dane,
- zdjęcia.

Porównywarka nie może zastępować mapy.

---

# 34. Dane nieruchomości

Minimalny model:

```text
Property
- id
- project_id
- type
- title
- latitude
- longitude
- price
- area
- rating
- status
- description
- created_by
- created_at
- updated_at
```

Model należy rozbudować o pola specyficzne dla typu poprzez odpowiednią architekturę danych.

Nie należy tworzyć ogromnej tabeli z setkami nullable columns, jeśli można tego uniknąć.

---

# 35. Dane specyficzne dla typu

Preferowane podejście:

Core Property:

```text
properties
```

Typ:

```text
property_types
```

Kryteria:

```text
criteria
```

Odpowiedzi:

```text
property_ratings
```

W razie potrzeby dane specyficzne dla typu mogą zostać rozdzielone na:

```text
land_properties
house_properties
```

Decyzję techniczną należy podjąć przed implementacją na podstawie pełnego modelu domenowego.

---

# 36. Zdjęcia — model

Przykładowo:

```text
property_photos
- id
- property_id
- storage_path
- thumbnail_path
- sort_order
- created_by
- created_at
```

Storage:

```text
properties/{property_id}/...
```

Zdjęcia powinny być zoptymalizowane pod mobile i map preview.

---

# 37. Notatki — model

```text
property_notes
- id
- property_id
- user_id
- content
- created_at
- updated_at
```

---

# 38. Linki — model

```text
property_links
- id
- property_id
- title
- url
- created_by
- created_at
```

URL należy walidować.

---

# 39. Project Membership

Przykładowy model:

```text
project_members
- project_id
- user_id
- role
- joined_at
```

Nie przechowywać członkostwa tylko jako JSON w projekcie.

---

# 40. Join Requests

```text
project_join_requests
- id
- project_id
- user_id
- status
- created_at
- reviewed_at
- reviewed_by
```

Status:

```text
PENDING
APPROVED
REJECTED
```

Użytkownik nie może sam ustawić statusu APPROVED.

---

# 41. Design system

Należy stworzyć spójny design system.

Powinien obejmować:

- typography,
- spacing,
- radius,
- shadows,
- borders,
- iconography,
- colors,
- buttons,
- inputs,
- cards,
- sheets,
- dialogs,
- badges,
- map markers.

Unikać przypadkowego mieszania stylów.

---

# 42. Rating colors

Kolorystyka ratingu musi być spójna w całej aplikacji.

Rating powinien być wizualnie zrozumiały.

Przykładowa koncepcja:

```text
1–3   LOW
4–5   BELOW AVERAGE
6–7   GOOD
8–9   VERY GOOD
10    EXCELLENT
```

Dokładne kolory należy ustalić w design systemie.

Nie używać wyłącznie koloru do komunikowania informacji krytycznej — rating powinien być również pokazany liczbą.

---

# 43. Accessibility

Aplikacja musi uwzględniać:

- keyboard navigation,
- focus states,
- odpowiedni kontrast,
- aria labels,
- touch target minimum,
- komunikaty błędów,
- dostępność mapy i markerów w możliwym zakresie.

Kolor nie może być jedynym sposobem przekazania informacji.

---

# 44. Performance

Mapa może zawierać dużą liczbę nieruchomości.

Architektura powinna uwzględniać:

- clustering,
- lazy loading,
- ograniczenie niepotrzebnych rerenderów,
- optymalizację zdjęć,
- cache,
- paginację danych,
- pobieranie tylko potrzebnych danych.

Nie należy pobierać wszystkich zdjęć pełnej rozdzielczości dla wszystkich nieruchomości przy otwarciu mapy.

---

# 45. MVP

MVP powinno zawierać:

### Authentication

- login,
- logout,
- Superadmin,
- tworzenie użytkowników.

### Projects

- tworzenie projektu,
- wyszukiwanie projektów,
- visibility,
- Join Request,
- approval,
- members.

### Properties

- dodawanie,
- edycja,
- usuwanie,
- DOM,
- ZIEMIA,
- lokalizacja.

### Map

- Google Maps,
- custom SVG markers,
- rating colors,
- property preview.

### Rating

- pytania,
- skala 1–10,
- rating końcowy.

### Photos

- upload,
- camera on mobile,
- gallery.

### Notes

- dodawanie,
- edycja.

### Links

- dodawanie,
- otwieranie.

### Security

- Supabase Auth,
- RLS.

---

# 46. Kolejność implementacji

Zalecana kolejność:

## Phase 0

Project setup.

## Phase 1

Supabase + database + Auth.

## Phase 2

Users + roles + Superadmin.

## Phase 3

Projects + memberships + Join Requests.

## Phase 4

Property data model.

## Phase 5

Google Maps.

## Phase 6

Custom SVG markers.

## Phase 7

Property creation.

## Phase 8

Rating system.

## Phase 9

Photos + Storage.

## Phase 10

Notes + links.

## Phase 11

Filtering + search.

## Phase 12

Comparison.

## Phase 13

Mobile polish.

## Phase 14

Security audit + performance + testing.

---

# 47. AI development rules

Każde AI pracujące nad projektem musi:

1. Najpierw przeczytać `MASTER_PROMPT.md`.
2. Nie zmieniać architektury bez uzasadnienia.
3. Nie tworzyć fake backendów, jeśli istnieje właściwy Supabase backend.
4. Nie używać mock data jako substytutu implementacji produkcyjnej bez wyraźnego oznaczenia.
5. Nie hard-code'ować użytkowników.
6. Nie hard-code'ować kryteriów w UI.
7. Nie umieszczać API keys w kodzie.
8. Nie commitować `.env`.
9. Nie obchodzić RLS.
10. Nie dodawać zależności bez uzasadnienia.
11. Preferować istniejące komponenty i abstractions.
12. Pisać typowany kod TypeScript.
13. Walidować dane wejściowe.
14. Projektować mobile-first.
15. Zachować map-first UX.
16. Nie zastępować custom markerów standardowymi markerami Google bez uzasadnienia.
17. Każdą zmianę modelu danych dokumentować.
18. Po większej zmianie aktualizować odpowiednią dokumentację.

---

# 48. API keys i secrets

Żadne sekrety nie mogą znaleźć się w repozytorium.

Przykładowe environment variables:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAP_ID=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` nigdy nie może być dostępny w browserze.

`.env.local` musi być w `.gitignore`.

---

# 49. Nie używamy zewnętrznych API nieruchomości

To jest LOCKED DECISION.

Nie budujemy integracji z:

- Otodom API,
- OLX API,
- Morizon API,
- innymi portalami nieruchomości.

Na obecnym etapie dane są wprowadzane ręcznie.

Link do ogłoszenia jest tylko referencją do zewnętrznej strony.

---

# 50. Zasada dla przyszłego AI

Jeżeli AI otrzyma polecenie:

> "Dodaj funkcję X"

najpierw powinno:

1. sprawdzić istniejącą architekturę,
2. przeczytać relevant documentation,
3. sprawdzić model danych,
4. sprawdzić istniejące komponenty,
5. zaproponować minimalną zmianę,
6. dopiero następnie implementować.

Nie należy tworzyć równoległej architektury.

---

# 51. Open Questions

Poniższe elementy nie są jeszcze zamknięte:

- dokładna lista kryteriów dla ZIEMIA,
- dokładna lista kryteriów dla DOM,
- sposób liczenia weighted rating,
- dokładne progi kolorów ratingu,
- finalny design SVG markerów,
- czy Project Admin będzie potrzebny w MVP,
- czy projekty discoverable będą pokazywać liczbę członków,
- czy właściciel może transferować ownership,
- szczegółowy status nieruchomości,
- szczegółowy model pól DOM,
- szczegółowy model pól ZIEMIA.

AI nie powinno samodzielnie traktować tych elementów jako zamkniętych decyzji.

---

# 52. Locked Decisions

Poniższe decyzje są uznane za ustalone:

- nazwa projektu: Myszogród,
- województwo śląskie jako pierwszy obszar,
- aplikacja map-first,
- Google Maps,
- każda nieruchomość ma lat/lng,
- każda nieruchomość pojawia się na mapie,
- DOM i ZIEMIA jako typy MVP,
- outline SVG jako ikony,
- translucent halo wokół markerów,
- ikona oznacza typ,
- kolor oznacza rating,
- rating 1–10,
- osobne pytania dla DOM i ZIEMIA,
- konfigurowalny system kryteriów,
- zdjęcia z telefonu,
- Supabase Storage,
- notatki,
- linki do ogłoszeń,
- projekty,
- Project Owner,
- wyszukiwanie projektów,
- Join Request,
- approval przez Project Owner,
- brak publicznej rejestracji,
- konta tworzone przez Superadmina,
- Superadmin,
- Supabase,
- PostgreSQL,
- Supabase Auth,
- Supabase RLS,
- mobile-first,
- premium/modern UX,
- brak API portali nieruchomości.

---

# 53. Najważniejszy produktowy cel

Myszogród ma sprawić, że użytkownik patrząc na mapę jest w stanie w ciągu kilku sekund odpowiedzieć:

**Gdzie są interesujące mnie nieruchomości?**

**Które z nich mają najwyższą ocenę?**

**Dlaczego dana nieruchomość dostała taką ocenę?**

**Które nieruchomości warto obejrzeć?**

**Co myślą o niej pozostali członkowie projektu?**

Cały UX powinien prowadzić właśnie do tych odpowiedzi.

---

# 54. Final principle

Nie budujemy kolejnego portalu ogłoszeniowego.

Budujemy:

**wizualny, współdzielony system podejmowania decyzji dotyczących nieruchomości.**

Mapa + ocena + zdjęcia + notatki + współpraca użytkowników są centralnymi elementami produktu.