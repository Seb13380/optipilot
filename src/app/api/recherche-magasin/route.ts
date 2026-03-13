import { NextRequest, NextResponse } from "next/server";

interface Siege {
  siret: string;
  adresse: string;
  geo_adresse: string | null;
  commune: string;
  libelle_commune: string;
  code_postal: string;
  numero_voie: string | null;
  type_voie: string | null;
  libelle_voie: string | null;
  complement_adresse: string | null;
}

interface Etablissement {
  siret: string;
  nom_complet: string;
  nom_commercial: string | null;
  siege: Siege;
  activite_principale: string;
  etat_administratif: string;
}

interface SearchResult {
  results: Etablissement[];
  total_results: number;
}

type MagasinItem = { siret: string; nom: string; adresse: string; ville: string; codePostal: string };

function buildAdresse(s: Partial<Siege>): string {
  if (s.geo_adresse) return s.geo_adresse;
  const parts = [s.numero_voie, s.type_voie, s.libelle_voie].filter(Boolean).join(" ");
  return parts || s.complement_adresse || s.adresse || "";
}

function toTitleCase(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function searchEtablissements(q: string): Promise<Etablissement[]> {
  const url = new URL("https://recherche-entreprises.api.gouv.fr/search");
  url.searchParams.set("q", q);
  url.searchParams.set("per_page", "25");
  url.searchParams.set("etat_administratif", "A");
  try {
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return [];
    const data: SearchResult = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ magasins: [], total: 0 });
  }

  try {
    // Double recherche en parallele :
    // 1) "optique <query>" - trouve les opticiens par localisation/nom
    // 2) "<query>" seul - trouve par nom exact d'entreprise
    const [geoResults, nameResults] = await Promise.all([
      searchEtablissements(`optique ${query}`),
      searchEtablissements(query),
    ]);

    const allResults = [...geoResults, ...nameResults];

    // Dedupliquer par SIRET et normaliser
    const seen = new Set<string>();
    const magasins: MagasinItem[] = [];

    for (const e of allResults) {
      const siret = e.siege?.siret;
      if (siret && !seen.has(siret)) {
        seen.add(siret);
        const villeRaw = e.siege.libelle_commune || e.siege.commune || "";
        magasins.push({
          siret,
          nom: e.nom_complet,
          adresse: buildAdresse(e.siege),
          ville: toTitleCase(villeRaw),
          codePostal: e.siege.code_postal || "",
        });
      }
    }

    return NextResponse.json({ magasins, total: magasins.length });
  } catch (err) {
    console.error("recherche-magasin error:", err);
    return NextResponse.json({ magasins: [], total: 0, error: "Erreur API" });
  }
}
