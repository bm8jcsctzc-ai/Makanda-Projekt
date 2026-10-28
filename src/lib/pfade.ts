// Adressen der Seiten. GitHub Pages kennt nur feste Seiten, darum stehen IDs im Parameter ?id=…

const mit = (basis: string, werte: Record<string, string | null | undefined>) => {
  const q = new URLSearchParams(Object.entries(werte).filter((e): e is [string, string] => !!e[1]));
  const text = q.toString();
  return text ? `${basis}?${text}` : basis;
};

export const pfad = {
  kunde: (id: string) => `/kunden/ansehen/?id=${id}`,
  kundeBearbeiten: (id: string) => `/kunden/bearbeiten/?id=${id}`,
  anlage: (id: string) => `/anlagen/ansehen/?id=${id}`,
  anlageBearbeiten: (id: string) => `/anlagen/bearbeiten/?id=${id}`,
  anlageNeu: (kundeId: string) => `/anlagen/neu/?kunde=${kundeId}`,
  einsatz: (id: string) => `/einsaetze/ansehen/?id=${id}`,
  einsatzBearbeiten: (id: string) => `/einsaetze/bearbeiten/?id=${id}`,
  einsatzNeu: (werte: { kunde?: string | null; anlage?: string | null; datum?: string | null } = {}) => mit("/einsaetze/neu/", werte),
  checkliste: (id: string) => `/einsaetze/checkliste/?id=${id}`,
  abwesenheit: (id: string) => `/urlaub/ansehen/?id=${id}`,
  rechnung: (id: string) => `/finanzen/rechnungen/bearbeiten/?id=${id}`,
  fixkosten: (id: string) => `/finanzen/fixkosten/bearbeiten/?id=${id}`,
  gehalt: (id: string) => `/finanzen/gehaelter/bearbeiten/?id=${id}`,
  vorlage: (id: string) => `/einstellungen/checklisten/bearbeiten/?id=${id}`,
  mit,
};
